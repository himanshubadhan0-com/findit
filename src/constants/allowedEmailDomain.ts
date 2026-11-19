/**
 * allowedEmailDomain.ts — which email addresses may create an account.
 *
 * EMPTY LIST = ANY valid email can sign up (the current setting).
 *
 * To restrict sign-ups to your college, add its domain, e.g. ['college.edu'].
 * Sub-domains are then accepted too ('student.college.edu'), but look-alikes
 * such as 'fakecollege.edu' are not (see isAllowedEmail in utils/validators.ts).
 */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = [];

/** True when sign-ups are limited to specific domains. */
export const IS_EMAIL_DOMAIN_RESTRICTED = ALLOWED_EMAIL_DOMAINS.length > 0;

/** Human-friendly version for hints, e.g. "@college.edu" ('' when unrestricted). */
export const ALLOWED_DOMAINS_LABEL = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(' or ');
