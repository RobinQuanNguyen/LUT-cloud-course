import re
from collections import Counter
from typing import List, Dict

URL_REGEX = re.compile(r"(https?://[^\s]+|www\.[^\s]+)", re.IGNORECASE)
REPEATED_PUNCT_REGEX = re.compile(r"([!?.,])\1{2,}")
MULTI_SPACE_REGEX = re.compile(r"\s+")

SPAM_KEYWORDS = {
    "buy now",
    "limited offer",
    "urgent",
    "act now",
    "winner",
    "congratulations",
    "free money",
    "earn cash",
    "cheap deal",
    "click now",
    "exclusive offer",
    "promo",
    "discount",
}

PHISHING_KEYWORDS = {
    "verify your account",
    "reset your password",
    "confirm your identity",
    "bank account",
    "security alert",
    "login immediately",
    "click the link",
    "update your payment",
    "suspended account",
    "claim prize",
    "otp",
    "one time password",
}

PROFANITY_KEYWORDS = {
    "trash",
    "shut up",
    "hate you",
}

SUSPICIOUS_TLDS = {
    ".ru",
    ".xyz",
    ".top",
    ".click",
    ".work",
    ".gq",
    ".cf",
    ".ml",
}

COMMON_SAFE_DOMAINS = {
    "google.com",
    "youtube.com",
    "facebook.com",
    "github.com",
    "openai.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
}


def normalize_text(text: str) -> str:
    text = text.strip()
    text = MULTI_SPACE_REGEX.sub(" ", text)
    return text


def extract_urls(text: str) -> List[str]:
    return URL_REGEX.findall(text)


def is_uppercase_abuse(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 8:
        return False
    uppercase_count = sum(1 for c in letters if c.isupper())
    ratio = uppercase_count / len(letters)
    return ratio >= 0.7


def count_keyword_hits(text: str, keywords: set) -> List[str]:
    lowered = text.lower()
    return [kw for kw in keywords if kw in lowered]


def suspicious_link_flags(urls: List[str]) -> List[str]:
    flags = []

    for url in urls:
        lowered = url.lower()

        if any(tld in lowered for tld in SUSPICIOUS_TLDS):
            flags.append("suspicious_link_tld")

        if "@" in lowered:
            flags.append("suspicious_link_obfuscation")

        if any(shortener in lowered for shortener in ["bit.ly", "tinyurl", "t.co", "goo.gl"]):
            flags.append("shortened_link")

        trusted = any(domain in lowered for domain in COMMON_SAFE_DOMAINS)
        if not trusted:
            flags.append("untrusted_external_link")

    return list(sorted(set(flags)))


def build_result(message_id: str | None, sender_id: str | None, text: str) -> Dict:
    normalized = normalize_text(text)
    lowered = normalized.lower()

    risk_score = 0
    flags = []
    explanations = []

    urls = extract_urls(normalized)
    spam_hits = count_keyword_hits(lowered, SPAM_KEYWORDS)
    phishing_hits = count_keyword_hits(lowered, PHISHING_KEYWORDS)
    profanity_hits = count_keyword_hits(lowered, PROFANITY_KEYWORDS)

    if urls:
        risk_score += 20
        flags.append("contains_link")
        explanations.append("Message contains one or more external links.")

        link_flags = suspicious_link_flags(urls)
        for lf in link_flags:
            flags.append(lf)

        if "untrusted_external_link" in link_flags:
            risk_score += 15
            explanations.append("Message contains an external link from an untrusted domain.")

        if "suspicious_link_tld" in link_flags:
            risk_score += 15
            explanations.append("Message contains a link with a suspicious top-level domain.")

        if "shortened_link" in link_flags:
            risk_score += 10
            explanations.append("Message contains a shortened URL, which may hide the destination.")

        if "suspicious_link_obfuscation" in link_flags:
            risk_score += 10
            explanations.append("Message contains obfuscated link characters.")

    if spam_hits:
        flags.append("spam_detected")
        hit_count = len(spam_hits)
        risk_score += min(25, hit_count * 8)
        explanations.append(f"Spam-like language detected: {', '.join(sorted(spam_hits))}.")

    if phishing_hits:
        flags.append("phishing_suspected")
        hit_count = len(phishing_hits)
        risk_score += min(30, hit_count * 10)
        explanations.append(f"Phishing-related language detected: {', '.join(sorted(phishing_hits))}.")

    if profanity_hits:
        flags.append("abusive_language")
        hit_count = len(profanity_hits)
        risk_score += min(20, hit_count * 6)
        explanations.append(f"Abusive or offensive language detected: {', '.join(sorted(profanity_hits))}.")

    if is_uppercase_abuse(normalized):
        flags.append("caps_lock_abuse")
        risk_score += 10
        explanations.append("Message uses excessive uppercase letters.")

    if REPEATED_PUNCT_REGEX.search(normalized):
        flags.append("repeated_punctuation")
        risk_score += 8
        explanations.append("Message uses repeated punctuation excessively.")

    if len(normalized) > 600:
        flags.append("unusually_long_message")
        risk_score += 5
        explanations.append("Message length is unusually long.")

    if normalized.count("$") >= 2:
        flags.append("money_lure_pattern")
        risk_score += 8
        explanations.append("Message heavily references money-related bait patterns.")

    if normalized.count("http") >= 2 or normalized.count("www.") >= 2:
        flags.append("multiple_links")
        risk_score += 10
        explanations.append("Message contains multiple links.")

    risk_score = min(100, risk_score)

    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "messageId": message_id,
        "senderId": sender_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": list(sorted(set(flags))),
        "explanations": explanations,
        "normalized_text": normalized,
    }


def analyze_one(message: Dict) -> Dict:
    return build_result(
        message_id=message.get("messageId"),
        sender_id=message.get("senderId"),
        text=message.get("text", ""),
    )


def analyze_batch(messages: List[Dict]) -> List[Dict]:
    results = []
    normalized_counter = Counter()

    for message in messages:
        normalized = normalize_text(message.get("text", "")).lower()
        if normalized:
            normalized_counter[normalized] += 1

    for message in messages:
        result = analyze_one(message)
        normalized = result["normalized_text"].lower()

        if normalized and normalized_counter[normalized] >= 3:
            result["flags"].append("repeated_message_pattern")
            result["risk_score"] = min(100, result["risk_score"] + 15)
            result["explanations"].append("The same or very similar message appears repeatedly in the batch.")

            if result["risk_score"] >= 60:
                result["risk_level"] = "high"
            elif result["risk_score"] >= 30:
                result["risk_level"] = "medium"
            else:
                result["risk_level"] = "low"

            result["flags"] = list(sorted(set(result["flags"])))

        results.append(result)

    return results


def build_summary(results: List[Dict]) -> Dict:
    total_scanned = len(results)
    low_risk = sum(1 for r in results if r["risk_level"] == "low")
    medium_risk = sum(1 for r in results if r["risk_level"] == "medium")
    high_risk = sum(1 for r in results if r["risk_level"] == "high")

    flag_counter = Counter()
    for result in results:
        for flag in result["flags"]:
            flag_counter[flag] += 1

    most_common_flags = [
        {"flag": flag, "count": count}
        for flag, count in flag_counter.most_common(10)
    ]

    return {
        "total_scanned": total_scanned,
        "low_risk": low_risk,
        "medium_risk": medium_risk,
        "high_risk": high_risk,
        "most_common_flags": most_common_flags,
    }