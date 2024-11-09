# BN Mallorca ![deploy workflow](https://github.com/xiscosc/bn_mallorca_backend/actions/workflows/aws-deploy.yml/badge.svg)

Backend and infrastructure for the BN Mallorca Radio App.

- Infrastructure described in AWS CDK - Typescript.
- Functions implemented in Node JS.

## API Spec
[<img src="https://validator.swagger.io/validator?url=https://raw.githubusercontent.com/xiscosc/bn_mallorca_backend/main/open-api.v1.json">](open-api.v1.json)
## Architecture diagrams
### Track Polling
![docs/pollingsongs.png](docs/pollingsongs.png)
### Album Art Cache
![docs/albumartcache.png](docs/albumartcache.png)
### Device subscription
![docs/subscriptions.png](docs/subscriptions.png)
### Other Endpoints
![docs/otherapi.png](docs/otherapi.png)