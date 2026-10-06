# Questions for a lawyer / compliance adviser
Nothing in this repository is legal advice or a compliance claim. The product processes customer records "insurance/medical-style" (names, phone, date of birth, address, call length) and finance data. Before go-live, get answers to:

1. **Applicable regimes:** Which laws apply given where the organization, its customers, agents and outsource users are (e.g. HIPAA if the records are PHI of US patients; GDPR/UK GDPR for EU/UK data subjects; Pakistan's data protection rules or other local law; PCI-DSS if any card data ever enters the system; insurance regulators)?
2. **Roles:** Are we a controller/processor/business associate? Which contracts (DPA, BAA) are needed with each customer organization?
3. **Hosting and transfers:** Is the chosen cloud region/provider acceptable? Is cross-border transfer of records (including to outsource users in other countries) allowed, and under what mechanism?
4. **Vendors:** Are our sub-processors (cloud, email/SMTP, Sentry, CDN/WAF, pager, backup storage) approved? Does error monitoring or tracing risk exporting personal data, and do we need DPAs with them?
5. **Retention and deletion:** How long must records, audit logs, finance records and backups be kept, and for how long *may* they be kept? How do erasure/access requests interact with "audit evidence is never deleted" and with immutable (object-locked) backups?
6. **Breach notification:** Notification deadlines, thresholds, who is notified, and what evidence the audit log and request IDs must provide.
7. **Consent and lawful basis** for collecting date of birth/address and for recording call length; any call-recording rules if recordings are ever added.
8. **Access by staff:** Rules for Admin/CEO/Primary Super Admin viewing personal data; is the "hidden Super Admin activity" mechanism acceptable to auditors and regulators?
9. **Encryption requirements:** Are TLS + disk/DB/S3 encryption at rest sufficient, or are field-level encryption and customer-managed keys required?
10. **Logging:** What personal data may appear in logs, traces and error reports, and for how long?
11. **Disaster recovery obligations:** Contractual or regulatory RPO/RTO minimums; required DR testing evidence.
12. **Finance:** Tax/accounting record rules for income/expense data, voiding (vs deleting) entries, and multi-currency if baseCurrency changes.
13. **Terms/Privacy notice/DPIA:** Are a privacy notice, terms, and a data protection impact assessment required before launch?
14. **Pen-test and audit:** Is an independent penetration test or certification (SOC 2, ISO 27001) contractually required?
