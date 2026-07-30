# Frequently Asked Questions (FAQ)

### Q: Can I install this on non-Ubuntu distributions?
A: Debian 11/12 and CentOS Stream 9 are generally compatible with Docker, but `scripts/install.sh` is specifically tailored for Ubuntu 22.04 and 24.04 LTS.

### Q: How do I change my AI API keys after installation?
A: You can set them in the Web Interface under **Settings**, or edit `.env` and run `docker compose restart app`.

### Q: Does WooCommerce require specific WordPress plugins?
A: No extra plugins required! Just enable the native WooCommerce REST API in WooCommerce > Settings > Advanced > REST API.
