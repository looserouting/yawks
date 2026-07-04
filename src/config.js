export default {
    // --- Mail Configuration (Outgoing Only) ---
    mail: 'sendmail', // 'sendmail' or 'smtp'
    smtp_mailaddress: 'key-submission@positron-it.de',
    
    // if mail = 'smtp'
    smtp_host: 'smtp.example.com',
    smtp_port: 587,
    smtp_tls: true,
    smtp_authuser: 'user@example.com',
    smtp_authpass: 'password',

    // --- Key Management ---
    // Key used for signing validation emails and identifying the server
    submission_key_path: './submission.key',
    submission_key_passphrase: '', 

    // --- Domain & WKD ---
    domains: ['positron-it.de'],
    directory: './wkd_data', // Root directory for WKD files

    // --- Corporate & Privacy ---
    // Key authorized to revoke user keys (fingerprint is derived automatically)
    corporate_revocation_key_path: './corporate-revocation.key',
    corporate_revocation_key_passphrase: '',
    enforce_revoker: true,
    
    admin_api_key: 'admin-secret-123',
    
    enable_padding: true,
    padding_block_size: 4096,

    // --- Database ---
    database_uri: 'sqlite://db.sqlite'
}