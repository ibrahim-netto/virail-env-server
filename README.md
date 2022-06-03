# virail-env-server

## What is it?

A directus + expressjs  based microservice to handle project-wide configurations
As a stand alone, there are no blockers.


## What problem is this solving?

As the project grows in size and complexity, it becomes important to know what component does what and how. This is typically achieved using configuration files called .env (environment) that has a simple key=value syntax.
Manually managing .env files on many servers leads to issues, while having a centralized place where all configurations as stored and served simplifies distribution.


## What does success look like ?

A env.virail.io backend with directus where it is possilble to manage all variables, plus a env.viral.app api server that generates a custom .env file based on the client accessing it


## What do we need to do ?

Design a DB model ( the current CMS env tables can be used as a boilerplate)
Implement ip-based Auth (to allow key-less access)
Implement a nodejs API server to generate the key=value env file