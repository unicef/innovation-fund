var config       = require('./config'); // get our config file

module.exports = {
  "type": "service_account",
  "project_id": process.env.fb_project_id || config.ga.project_id,
  "private_key_id": process.env.fb_private_key_id || config.ga.private_key_id,
  "private_key": (process.env.fb_private_key1 + process.env.fb_private_key2) || config.ga.private_key,
  "client_email": process.env.fb_client_email || config.ga.client_email,
  "client_id": process.env.fb_client_id || config.ga.client_id,
  "auth_uri": process.env.fb_auth_uri || config.ga.auth_uri,
  "token_uri": process.env.fb_token_uri || config.ga.token_uri,
  "auth_provider_x509_cert_url": process.env.fb_auth_provider_x509_cert_url || config.ga.auth_provider_x509_cert_url,
  "client_x509_cert_url": process.env.fb_client_x509_cert_url || config.ga.client_x509_cert_url
}
