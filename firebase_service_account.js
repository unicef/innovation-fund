var config       = require('./config'); // get our config file

module.exports = {
  "type": "service_account",
  "project_id": process.env.fb_project_id || config.fb.project_id,
  "private_key_id": process.env.fb_private_key_id || config.fb.private_key_id,
  "private_key": (process.env.fb_private_key1 + process.env.fb_private_key2) || config.fb.private_key,
  "client_email": process.env.fb_client_email || config.fb.client_email,
  "client_id": process.env.fb_client_id || config.fb.client_id,
  "auth_uri": process.env.fb_auth_uri || config.fb.auth_uri,
  "token_uri": process.env.fb_token_uri || config.fb.token_uri,
  "auth_provider_x509_cert_url": process.env.fb_auth_provider_x509_cert_url || config.fb.auth_provider_x509_cert_url,
  "client_x509_cert_url": process.env.fb_client_x509_cert_url || config.fb.client_x509_cert_url
}
