from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from inference import JobPredictionEngine
import json
import re
import math 
import requests
from datetime import datetime, timezone
from urllib.parse import urlparse
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
GEMINI_SCRAPE_MODEL = os.getenv("GEMINI_SCRAPE_MODEL", GEMINI_MODEL)
GEMINI_SCORE_MODEL = os.getenv("GEMINI_SCORE_MODEL", GEMINI_MODEL)

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Global prediction engine
prediction_engine = None

def normalize_domain(value):
    if not isinstance(value, str):
        return None

    raw = value.strip().lower()
    if not raw:
        return None

    raw = re.sub(r"^https?://", "", raw)
    raw = re.sub(r"^www\.", "", raw)
    raw = raw.split("/")[0].split("?")[0].split("#")[0]
    raw = raw.split(":")[0]
    raw = raw.strip(".")
    return raw or None

def normalize_job_url(value):
    if not isinstance(value, str):
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if not re.match(r"^https?://", normalized, flags=re.IGNORECASE):
        normalized = f"https://{normalized}"

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return normalized

def extract_json_from_text(raw_text):
    clean = (raw_text or "").strip()
    clean = clean.strip("`").strip()
    clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s*```$", "", clean, flags=re.IGNORECASE)

    try:
        return json.loads(clean)
    except Exception:
        match = re.search(r"\{.*\}", clean, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError("No valid JSON object found in model response.")

def gemini_generate_json(prompt, model_name, use_url_context=False, temperature=0.0):
    if gemini_client is None:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY is not configured.")

    def run_request(force_text_mode=False):
        config_kwargs = {
            "temperature": temperature,
        }
        if not force_text_mode and not use_url_context:
            config_kwargs["response_mime_type"] = "application/json"
        if use_url_context:
            config_kwargs["tools"] = [{"url_context": {}}]

        response = gemini_client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        response_text = getattr(response, "text", None)
        return response, response_text

    errors = []
    for force_text_mode in [False, True]:
        response, response_text = run_request(force_text_mode=force_text_mode)
        if response_text:
            try:
                return extract_json_from_text(response_text)
            except Exception as parse_error:
                preview = response_text[:400]
                errors.append(f"JSON parse failed ({parse_error}). Raw response preview: {preview}")
                continue

        finish_reason = None
        try:
            finish_reason = response.candidates[0].finish_reason
        except Exception:
            pass

        prompt_feedback = getattr(response, "prompt_feedback", None)
        errors.append(
            f"Gemini returned an empty response. finish_reason={finish_reason}, prompt_feedback={prompt_feedback}"
        )

    unique_errors = []
    for error in errors:
        if error not in unique_errors:
            unique_errors.append(error)

    raise ValueError(" | ".join(unique_errors))

def build_scrape_prompt(url):
    return f"""
You are a job posting analyzer. Analyze this job posting URL: {url}

Extract and format ALL of the following information in a structured way. If information is not found, use reasonable defaults or leave as empty string.

1. Job Title (required): The main job title
2. Company Name: The employer or organization name
3. Recruiter Email: Any recruiter or hiring contact email visible on the page
4. Company Profile (required): Company description, background, and culture
5. Job Description (required): Detailed description of the role and responsibilities
6. Requirements (required): Skills, qualifications and requirements
7. Benefits (optional): Company benefits and perks
8. Employment Type: Must be one of [Full-time, Part-time, Contract, Temporary, Other]
9. Required Experience: Must be one of [Internship, Entry level, Associate, Mid-Senior level, Director, Executive, Not Specified]
10. Required Education: Must be one of [High School, Associate's Degree, Bachelor's Degree, Master's Degree, Doctorate, Certification, Some College, Not Specified]
11. Industry: The industry sector
12. Function: The job function or department

For the following, answer as 1 for yes and 0 for no:
13. Telecommuting: Is remote work mentioned or available?
14. Company Logo: Is there a company logo visible on the posting?
15. Screening Questions: Are there any screening or application questions?

Format the response as a JSON object matching these exact field names:
{{
    "title": "str",
    "company_name": "str",
    "recruiter_email": "str",
    "company_profile": "str",
    "description": "str",
    "requirements": "str",
    "benefits": "str",
    "employment_type": "str",
    "required_experience": "str",
    "required_education": "str",
    "industry": "str",
    "function": "str",
    "telecommuting": 0,
    "has_company_logo": 0,
    "has_questions": 0
}}

Return JSON only. No markdown, no explanation, no extra text.
""".strip()

def build_fraud_score_prompt(job_data, job_link):
    return f"""
You are a strict evaluator that analyzes a job posting and produces a single numeric fraud probability score.

Your task:
- Return ONLY valid JSON containing:
      "fraud_score": <float between 0.00 and 100.00>

Meaning of the score:
- 0.00 -> extremely likely to be GENUINE
- 100.00 -> extremely likely to be FAKE
- Must be PRECISE (not rounded to whole numbers).

Strict Rules:
- Score must be entirely based on:
      (a) Job data provided
      (b) Website / job link authenticity
- Do NOT assume anything beyond what is given.
- Do NOT hallucinate anything not explicitly present.
- Score must ALWAYS be between 0.00 and 100.00.
- NEVER output 0 or 100 unless evidence is overwhelming.
- MUST produce the EXACT SAME output for identical input.
- NO explanations. NO extra text.

Evaluation Criteria:
- Grammar, clarity, completeness
- Unrealistic salary or perks
- Pressure language ("urgent", "immediate hire")
- Requests for sensitive info
- Description inconsistencies
- Missing company profile
- URL authenticity signals (HTTPS, domain trustworthiness)
- Scam-like patterns visible in content

Job Data: {json.dumps(job_data, ensure_ascii=True, sort_keys=True)}
Job Link: {job_link}

Return ONLY:
{{ "fraud_score": <float> }}
""".strip()

def coerce_scraped_job_data(job_data):
    defaults = {
        "title": "",
        "company_name": "",
        "recruiter_email": "",
        "company_profile": "",
        "description": "",
        "requirements": "",
        "benefits": "",
        "telecommuting": 0,
        "has_company_logo": 0,
        "has_questions": 0,
        "employment_type": "Full-time",
        "required_experience": "Not Specified",
        "required_education": "Not Specified",
        "industry": "",
        "function": "",
    }

    cleaned = defaults.copy()
    cleaned.update(job_data or {})

    for field in ["telecommuting", "has_company_logo", "has_questions"]:
        value = cleaned.get(field, 0)
        cleaned[field] = 1 if str(value).strip().lower() in ["1", "true", "yes", "y"] else 0

    valid_employment_types = {"Full-time", "Part-time", "Contract", "Temporary", "Other"}
    if cleaned["employment_type"] not in valid_employment_types:
        cleaned["employment_type"] = "Other"

    valid_experience = {"Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive", "Not Specified"}
    if cleaned["required_experience"] not in valid_experience:
        cleaned["required_experience"] = "Not Specified"

    valid_education = {
        "High School",
        "Bachelor's Degree",
        "Master's Degree",
        "Doctorate",
        "Associate's Degree",
        "Certification",
        "Some College",
        "Not Specified",
    }
    if cleaned["required_education"] not in valid_education:
        cleaned["required_education"] = "Not Specified"

    for field in ["title", "company_name", "recruiter_email", "company_profile", "description", "requirements", "benefits", "industry", "function"]:
        value = cleaned.get(field, "")
        cleaned[field] = value.strip() if isinstance(value, str) else str(value or "")

    return cleaned

def extract_domain_from_url(value):
    if not isinstance(value, str) or not value.strip():
        return None
    return normalize_domain(value)

def extract_email_domains(job_data):
    combined_text = " ".join(extract_text_chunks(job_data, ['title', 'recruiter_email', 'company_profile', 'description', 'requirements', 'benefits']))
    emails = re.findall(r"\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b", combined_text, flags=re.IGNORECASE)
    return sorted({normalize_domain(domain) for domain in emails if normalize_domain(domain)})

def extract_text_chunks(job_data, fields=None):
    target_fields = fields or [
        'title', 'company_name', 'recruiter_email', 'company_website', 'company_linkedin',
        'registration_id', 'company_location', 'company_profile', 'description', 'requirements', 'benefits'
    ]
    text_chunks = []

    for field in target_fields:
        value = job_data.get(field, '')
        if isinstance(value, str) and value.strip():
            text_chunks.append(value.strip())

    return text_chunks

def extract_reference_domains(job_data, job_link):
    candidate_domains = []

    explicit_website = extract_domain_from_url(job_data.get('company_website'))
    if explicit_website:
        candidate_domains.append(explicit_website)

    if isinstance(job_link, str) and job_link.strip() and job_link != "manual-input":
        link_domain = extract_domain_from_url(job_link)
        if link_domain:
            candidate_domains.append(link_domain)

    text_chunks = extract_text_chunks(job_data, ['company_website', 'company_linkedin', 'company_profile', 'description', 'requirements', 'benefits'])

    urls = re.findall(r"(https?://[^\s)]+|www\.[^\s)]+)", " ".join(text_chunks), flags=re.IGNORECASE)
    for url in urls:
        domain = extract_domain_from_url(url)
        if domain:
            candidate_domains.append(domain)

    normalized = []
    for domain in candidate_domains:
        if domain not in normalized:
            normalized.append(domain)
    return normalized

def is_domain_consistent(email_domain, reference_domain):
    return (
        email_domain == reference_domain or
        email_domain.endswith("." + reference_domain) or
        reference_domain.endswith("." + email_domain)
    )

def analyze_email_consistency(job_data, job_link):
    email_domains = extract_email_domains(job_data)
    reference_domains = extract_reference_domains(job_data, job_link)

    analysis = {
        'status': 'unverified',
        'score': 50.0,
        'risk_level': 'Unknown',
        'summary': 'No company email or website domain was available to compare.',
        'matched_domains': [],
        'mismatched_domains': email_domains,
        'email_domains': email_domains,
        'reference_domains': reference_domains
    }

    if not email_domains:
        analysis['summary'] = 'No recruiter or company email address was found in the job content.'
        return analysis

    if not reference_domains:
        analysis['summary'] = 'Email addresses were found, but no company website or source domain was available for comparison.'
        return analysis

    matched_domains = []
    mismatched_domains = []

    for email_domain in email_domains:
        if any(is_domain_consistent(email_domain, reference_domain) for reference_domain in reference_domains):
            matched_domains.append(email_domain)
        else:
            mismatched_domains.append(email_domain)

    analysis['matched_domains'] = matched_domains
    analysis['mismatched_domains'] = mismatched_domains

    if matched_domains and not mismatched_domains:
        analysis['status'] = 'consistent'
        analysis['score'] = 5.0
        analysis['risk_level'] = 'Low'
        analysis['summary'] = 'The detected email domain matches the company or source domain.'
    elif matched_domains and mismatched_domains:
        analysis['status'] = 'mixed'
        analysis['score'] = 45.0
        analysis['risk_level'] = 'Medium'
        analysis['summary'] = 'Some email domains match the company domain, but others do not.'
    else:
        analysis['status'] = 'mismatch'
        analysis['score'] = 80.0
        analysis['risk_level'] = 'High'
        analysis['summary'] = 'The detected email domain does not match the company or source domain.'

    return analysis

def extract_primary_company_domain(job_data, job_link):
    reference_domains = extract_reference_domains(job_data, job_link)
    return reference_domains[0] if reference_domains else None

def extract_company_name(job_data, job_link):
    explicit_name = job_data.get("company_name")
    if isinstance(explicit_name, str) and explicit_name.strip():
        return explicit_name.strip()

    domain = extract_primary_company_domain(job_data, job_link)
    if domain:
        stem = domain.split(".")[0]
        if stem:
            return " ".join(part.capitalize() for part in re.split(r"[-_]+", stem) if part)

    return None

def normalize_company_name(name):
    if not isinstance(name, str):
        return ""

    cleaned = name.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    suffixes = {
        "private", "limited", "ltd", "llp", "inc", "corp", "corporation", "company",
        "co", "plc", "technologies", "technology", "solutions", "services"
    }
    words = [word for word in cleaned.split() if word and word not in suffixes]
    return " ".join(words)

def detect_mca_identifier(job_data):
    combined_text = " ".join(extract_text_chunks(job_data))
    explicit_identifier = job_data.get("registration_id")
    if isinstance(explicit_identifier, str) and explicit_identifier.strip():
        combined_text = f"{explicit_identifier.strip()} {combined_text}"

    patterns = [
        ("CIN", r"\b[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b"),
        ("FCRN", r"\bF[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b"),
        ("LLPIN", r"\b[A-Z]{3}-[0-9]{4}\b"),
        ("FLLPIN", r"\bF[A-Z]{2}-[0-9]{4}\b"),
    ]

    for identifier_type, pattern in patterns:
        match = re.search(pattern, combined_text, flags=re.IGNORECASE)
        if match:
            return {
                "identifier_type": identifier_type,
                "identifier_value": match.group(0).upper()
            }

    return None

def analyze_mca_registration(job_data, company_name, domain):
    identifier = detect_mca_identifier(job_data)
    is_india_hint = bool(domain and domain.endswith(".in"))
    analysis = {
        "status": "unverified",
        "score": 50.0,
        "risk_level": "Unknown",
        "summary": "No MCA registration signal was available to verify.",
        "company_name": company_name,
        "identifier_type": identifier["identifier_type"] if identifier else None,
        "identifier_value": identifier["identifier_value"] if identifier else None,
        "source": "mca.gov.in",
        "lookup_available": False,
    }

    if identifier:
        analysis["status"] = "identifier_found"
        analysis["score"] = 20.0
        analysis["risk_level"] = "Low"
        analysis["summary"] = (
            f"An MCA-style {identifier['identifier_type']} identifier was found in the job content. "
            "That is a positive legitimacy signal."
        )
        return analysis

    if is_india_hint:
        analysis["status"] = "identifier_missing"
        analysis["score"] = 65.0
        analysis["risk_level"] = "Medium"
        analysis["summary"] = (
            "The job appears India-linked, but no MCA company identifier was found in the job content."
        )
        return analysis

    analysis["summary"] = (
        "No MCA identifier was found, and the job does not clearly indicate an India-registered company."
    )
    return analysis

def get_explorium_api_key():
    return (
        os.getenv("EXPLORIUM_API_KEY")
        or os.getenv("EXPLORIUM_PLATFORM_KEY")
        or os.getenv("EXPLORIUM_KEY")
    )

def build_explorium_headers():
    api_key = get_explorium_api_key()
    headers = {
        "Content-Type": "application/json",
        "api_key": api_key,
        "User-Agent": "weaver-explorium-check/1.0",
    }

    tenant = os.getenv("EXPLORIUM_TENANT")
    if tenant:
        headers["tenant"] = tenant

    return headers

def explorium_post(path, payload):
    response = requests.post(
        f"https://api.explorium.ai{path}",
        headers=build_explorium_headers(),
        json=payload,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()

def extract_first_matched_business(match_payload):
    matched_businesses = match_payload.get("matched_businesses", [])
    if not matched_businesses:
        return None

    first_match = matched_businesses[0] or {}
    if isinstance(first_match, dict):
        if first_match.get("business_id"):
            return first_match
        nested_candidate = first_match.get("data") or first_match.get("business")
        if isinstance(nested_candidate, dict) and nested_candidate.get("business_id"):
            return nested_candidate

    return None

def normalize_url_for_matching(domain):
    if not domain:
        return None
    return f"https://{domain}"

def analyze_explorium_company_lookup(company_name, domain):
    api_key = get_explorium_api_key()
    analysis = {
        "status": "unverified",
        "score": 50.0,
        "risk_level": "Unknown",
        "summary": "Explorium lookup could not be performed.",
        "company_name": company_name,
        "matched_name": None,
        "matched_domain": None,
        "business_id": None,
        "linkedin_profile": None,
        "industry": None,
        "employee_range": None,
        "revenue_range": None,
        "country": None,
        "source": "Explorium",
        "lookup_available": bool(api_key),
    }

    if not company_name and not domain:
        analysis["summary"] = "No company name or domain was available for Explorium matching."
        return analysis

    if not api_key:
        analysis["summary"] = "Explorium API key is not configured, so company lookup was skipped."
        return analysis

    try:
        match_payload = explorium_post(
            "/v1/businesses/match",
            {
                "businesses_to_match": [
                    {
                        "name": company_name,
                        "domain": domain,
                        "url": normalize_url_for_matching(domain),
                    }
                ],
                "request_context": None,
            },
        )
        match = extract_first_matched_business(match_payload)

        if not match:
            analysis["status"] = "not_found"
            analysis["score"] = 70.0
            analysis["risk_level"] = "High"
            analysis["summary"] = "Explorium did not find a confident company match for the supplied company details."
            return analysis

        business_id = match.get("business_id")
        analysis["business_id"] = business_id

        firmographics_payload = explorium_post(
            "/v1/businesses/firmographics/enrich",
            {
                "business_id": business_id,
                "request_context": None,
                "parameters": {},
            },
        )
        firmographics = firmographics_payload.get("data", {}) if isinstance(firmographics_payload, dict) else {}

        matched_name = firmographics.get("name") or match.get("name")
        matched_domain = normalize_domain(firmographics.get("website") or match.get("domain"))
        normalized_query = normalize_company_name(company_name)
        normalized_match = normalize_company_name(matched_name)

        analysis["matched_name"] = matched_name
        analysis["matched_domain"] = matched_domain
        analysis["linkedin_profile"] = firmographics.get("linkedin_profile")
        analysis["industry"] = firmographics.get("linkedin_industry_category") or firmographics.get("naics_description")
        analysis["employee_range"] = firmographics.get("number_of_employees_range")
        analysis["revenue_range"] = firmographics.get("yearly_revenue_range")
        analysis["country"] = firmographics.get("country_name")

        exact_name_match = bool(normalized_query and normalized_query == normalized_match)
        exact_domain_match = bool(domain and matched_domain and domain == matched_domain)
        partial_name_match = bool(normalized_query and normalized_match and normalized_query in normalized_match)

        if exact_name_match or exact_domain_match:
            analysis["status"] = "matched"
            analysis["score"] = 15.0
            analysis["risk_level"] = "Low"
            analysis["summary"] = "Explorium found a strong company match with supporting firmographic data."
        elif partial_name_match:
            analysis["status"] = "possible_match"
            analysis["score"] = 35.0
            analysis["risk_level"] = "Medium"
            analysis["summary"] = "Explorium found a possible company match, but the identity is not exact."
        else:
            analysis["status"] = "weak_match"
            analysis["score"] = 55.0
            analysis["risk_level"] = "Medium"
            analysis["summary"] = "Explorium returned a company profile, but the match confidence is limited."

        return analysis
    except Exception as exc:
        analysis["summary"] = "Explorium lookup failed during request or parsing."
        analysis["lookup_error"] = str(exc)
        return analysis

def analyze_registration_check(job_data, job_link):
    company_name = extract_company_name(job_data, job_link)
    domain = extract_primary_company_domain(job_data, job_link)
    mca = analyze_mca_registration(job_data, company_name, domain)
    explorium = analyze_explorium_company_lookup(company_name, domain)

    source_scores = [source["score"] for source in [mca, explorium] if source.get("status") != "unverified"]
    overall_score = round(sum(source_scores) / len(source_scores), 2) if source_scores else 50.0

    if overall_score < 25:
        risk_level = "Low"
        status = "registered_signal_found"
        summary = "Registry-related signals support that the company may be legitimate."
    elif overall_score < 60:
        risk_level = "Medium"
        status = "mixed"
        summary = "Registry-related signals are mixed or incomplete."
    elif source_scores:
        risk_level = "High"
        status = "weak"
        summary = "Registry-related signals are weak and deserve caution."
    else:
        risk_level = "Unknown"
        status = "unverified"
        summary = "Registry checks could not be confidently completed."

    return {
        "status": status,
        "score": overall_score,
        "risk_level": risk_level,
        "summary": summary,
        "company_name": company_name,
        "sources": {
            "mca": mca,
            "explorium": explorium,
        }
    }

def parse_domain_event_date(value):
    if not value or not isinstance(value, str):
        return None

    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass

    known_formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in known_formats:
        try:
            parsed = datetime.strptime(normalized, fmt)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None

def lookup_domain_registration_date(domain):
    urls = [
        f"https://rdap.org/domain/{domain}",
        f"https://rdap.verisign.com/com/v1/domain/{domain}",
    ]

    headers = {
        "Accept": "application/rdap+json, application/json",
        "User-Agent": "weaver-domain-check/1.0"
    }

    last_error = None

    for url in urls:
        try:
            response = requests.get(url, headers=headers, timeout=6)
            response.raise_for_status()
            payload = response.json()

            event_dates = []
            for event in payload.get("events", []):
                action = str(event.get("eventAction", "")).lower()
                event_date = parse_domain_event_date(event.get("eventDate"))
                if not event_date:
                    continue
                if action in {"registration", "registered", "creation", "created"}:
                    event_dates.append(event_date)

            # Fallbacks for providers that use direct fields.
            for fallback_key in ["created", "creationDate", "registrationDate"]:
                fallback_date = parse_domain_event_date(payload.get(fallback_key))
                if fallback_date:
                    event_dates.append(fallback_date)

            if event_dates:
                return min(event_dates), None

            last_error = "Registration date not found in RDAP response."
        except Exception as exc:
            last_error = str(exc)

    return None, last_error

def analyze_domain_age(job_data, job_link):
    domain = extract_primary_company_domain(job_data, job_link)
    analysis = {
        "status": "unverified",
        "score": 50.0,
        "risk_level": "Unknown",
        "summary": "No company domain was available for domain age analysis.",
        "checked_domain": domain,
        "created_at": None,
        "age_days": None,
        "age_years": None,
        "lookup_source": "rdap",
        "lookup_error": None,
    }

    if not domain:
        return analysis

    created_at, lookup_error = lookup_domain_registration_date(domain)
    if not created_at:
        analysis["summary"] = "The company domain was found, but its registration date could not be verified."
        analysis["lookup_error"] = lookup_error
        return analysis

    now = datetime.now(timezone.utc)
    age_days = max(0, (now - created_at.astimezone(timezone.utc)).days)
    age_years = round(age_days / 365.25, 2)

    analysis["checked_domain"] = domain
    analysis["created_at"] = created_at.astimezone(timezone.utc).isoformat()
    analysis["age_days"] = age_days
    analysis["age_years"] = age_years

    if age_days < 90:
        analysis["status"] = "very_new"
        analysis["score"] = 90.0
        analysis["risk_level"] = "High"
        analysis["summary"] = "The company domain appears to be very new, which is a strong scam risk signal."
    elif age_days < 365:
        analysis["status"] = "new"
        analysis["score"] = 65.0
        analysis["risk_level"] = "Medium"
        analysis["summary"] = "The company domain is less than a year old, which deserves extra caution."
    elif age_days < 730:
        analysis["status"] = "established"
        analysis["score"] = 30.0
        analysis["risk_level"] = "Low"
        analysis["summary"] = "The company domain has been registered for over a year, which is a reassuring signal."
    else:
        analysis["status"] = "mature"
        analysis["score"] = 10.0
        analysis["risk_level"] = "Low"
        analysis["summary"] = "The company domain has a long registration history, which supports legitimacy."

    return analysis

def initialize_engine():
    """Initialize the prediction engine on startup"""
    global prediction_engine
    try:
        prediction_engine = JobPredictionEngine()
        print("[v0] Prediction engine initialized successfully")
        return True
    except Exception as e:
        print(f"[v0] Error initializing prediction engine: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    if prediction_engine is None:
        return jsonify({'status': 'ML Service is running but model not loaded'}), 503
    return jsonify({'status': 'ML Service is running', 'model_loaded': True})

@app.route('/api/list-models', methods=['GET'])
def list_models():
    """Return configured Gemini model info"""
    try:
        return jsonify({
            'available_models': [GEMINI_MODEL, GEMINI_SCRAPE_MODEL, GEMINI_SCORE_MODEL],
            'provider': 'google',
            'configured': gemini_client is not None,
            'default_model': GEMINI_MODEL,
            'scrape_model': GEMINI_SCRAPE_MODEL,
            'score_model': GEMINI_SCORE_MODEL,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if prediction_engine is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.json
        job_data = data.get('jobData')
        job_link = data.get('url')
        print("[DEBUG] Received job link for prediction:", job_link)

        if not isinstance(job_data, dict):
            return jsonify({'error': 'jobData must be an object'}), 400

        required_fields = ['title', 'company_profile', 'description', 'requirements', 'benefits']
        if not all(field in job_data for field in required_fields):
            return jsonify({'error': f'Missing required fields. Required: {required_fields}'}), 400

        email_consistency = analyze_email_consistency(job_data, job_link)
        domain_age = analyze_domain_age(job_data, job_link)
        registration_check = analyze_registration_check(job_data, job_link)

        # Base (CatBoost)
        result = prediction_engine.predict(job_data)
        catboost_fraud = float(result.get('confidence', 0.0))
        catboost_fraud = max(0.0, min(1.0, catboost_fraud))

        if job_link != "manual-input" and job_link is not None and job_link.strip() != "":
            print("[DEBUG] Performing LLM evaluation for job link:", job_link)

            fraud_score = None
            try:
                parsed = gemini_generate_json(
                    build_fraud_score_prompt(job_data, job_link),
                    GEMINI_SCORE_MODEL,
                    use_url_context=True,
                )
                fraud_score = float(parsed.get("fraud_score", 0.0))
                print("[DEBUG] Gemini fraud scoring response:", parsed)
            except Exception as llm_error:
                print("[DEBUG] Gemini fraud scoring failed:", str(llm_error))

            if fraud_score is None:
                fraud_score = 50.0

            fraud_score = max(0.0, min(100.0, fraud_score))
            print("[DEBUG] LLM fraud_score:", fraud_score)

            llm_fraud = fraud_score / 100.0

            # Weighted combination
            w_base = 0.3
            w_llm = 0.7

            final_fraud = (w_base * catboost_fraud) + (w_llm * llm_fraud)
            final_fraud = max(0.0, min(1.0, final_fraud))

            real_prob = 1.0 - final_fraud

            if final_fraud >= real_prob:
                result['prediction'] = 1
                result['result'] = "Fake Job"
                result['predicted_class_confidence'] = final_fraud
            else:
                result['prediction'] = 0
                result['result'] = "Real Job"
                result['predicted_class_confidence'] = real_prob

            result['confidence'] = final_fraud
            result['confidence_percentage'] = final_fraud * 100.0
            result['predicted_class_confidence_pct'] = result['predicted_class_confidence'] * 100.0

            msg = f"We are {math.ceil(result['predicted_class_confidence_pct'] * 100) / 100}% confident that this is a {result['result']}."
            result['confidence_message'] = msg

            pct = final_fraud * 100.0
            if pct < 30:
                fraud_label = "Genuine"
            elif pct < 50:
                fraud_label = "Seems Good"
            elif pct < 70:
                fraud_label = "Suspicious"
            elif pct < 80:
                fraud_label = "Highly Suspicious"
            else:
                fraud_label = "Fraudulent"

            result['fraud_confidence_label'] = fraud_label
            result['llm_fraud_score'] = float(f"{fraud_score:.2f}")

            print("[DEBUG] Final fraud probability:", final_fraud)
            print("[DEBUG] Result:", result)

        else:
            # No LLM → CatBoost only
            result['confidence'] = catboost_fraud
            result['confidence_percentage'] = catboost_fraud * 100.0
            result['predicted_class_confidence'] = catboost_fraud
            result['predicted_class_confidence_pct'] = catboost_fraud * 100.0
            result['prediction'] = 1 if catboost_fraud > 0.5 else 0

        result['company_verification'] = {
            'email_consistency': email_consistency,
            'domain_age': domain_age,
            'registration_check': registration_check
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/scrape', methods=['POST'])
def scrape():
    """
    Use Gemini URL context to extract the job fields needed by the ML model.
    Expected JSON: { "url": str }
    Returns: Formatted job data matching model requirements
    """
    try:
        data = request.json
        url = normalize_job_url(data.get('url'))
        
        if not url:
            return jsonify({'error': 'A valid job posting URL is required'}), 400

        try:
            job_data = gemini_generate_json(
                build_scrape_prompt(url),
                GEMINI_SCRAPE_MODEL,
                use_url_context=True,
            )
            print("[DEBUG] Gemini scraped job data:", job_data)
            return jsonify(coerce_scraped_job_data(job_data))
        except Exception as e:
            details = str(e)
            if "The provided URL is invalid" in details:
                details = (
                    "Gemini URL Context rejected this URL. Use the full public job-posting URL "
                    "including https://, and make sure it opens directly without login."
                )
            print("[DEBUG] Gemini scrape failed:", details)
            return jsonify({
                'error': 'Failed to extract job data from URL with Gemini',
                'details': details
            }), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/explain', methods=['POST'])
def explain():
    """
    Explain the prediction using SHAP and highlight major contributing features.

    Expected JSON: {
        "title": str,
        "company_profile": str,
        "description": str,
        "requirements": str,
        "benefits": str
    }

    Returns: {
        "top_contributors": [
            { "feature": str, "shap_value": float }
        ]
    }
    """
    try:
        if prediction_engine is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.json
        print("[DEBUG] Received data for explanation:", data)

        required_fields = ['title', 'company_profile', 'description', 'requirements', 'benefits']
        if not all(field in data for field in required_fields):
            print("[DEBUG] Missing required fields in data")
            return jsonify({'error': f'Missing required fields. Required: {required_fields}'}), 400

        # Call the updated explain_prediction method
        explanation = prediction_engine.explain_prediction(data)
        print("[DEBUG] Explanation result:", explanation)

        return jsonify({
            'top_contributors': explanation['top_contributors']
        })

    except Exception as e:
        print("[DEBUG] Error in /api/explain endpoint:", str(e))
        return jsonify({'error': str(e)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize prediction engine on startup
    
    if initialize_engine():
        app.run(debug=True, port=5001)
    else:
        print("[v0] Failed to initialize prediction engine. Please check model files.")
