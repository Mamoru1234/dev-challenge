# Dev challenge stage 0

### How to start and service
* build docker image `docker-compose build`
* start docker services `docker-compose up -d`
* run tests `docker exec -it stage_api sh -c "npm run test && npm run test:e2e"`

### Equation engine nodes
For now this service allows to build equation only using numbers. Indeed equation engine can be enhanced to support operations based on strings, bool, etc.