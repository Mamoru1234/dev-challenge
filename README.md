# Dev challenge stage 0

### How to start and service
* build docker image `docker-compose build`
* start docker services `docker-compose up -d`
* run tests `docker exec -it stage_api sh -c "npm run test && npm run test:e2e"`

### Equation engine problem
For now external_ref is supported in specific way, due to limitation of AST parser.