## Name

Stlog Notification Service

## Description

This service provides SMS and Email service to other microservices.

It has debit and credit of account balance built in to track consumption and top-ups.

## Account Usage Segregation

On Twilio, SMS transactions are segregated using "Alphanumeric ID" as sender, hence both ATS and Emart sends SMS using the ame API credentials.

On SendGrid, Email transactions are segregated using API keys.

## API

Whenever 'accountName' is required, there's only two options now: emart or ats.

**Notification**

    POST    /notifications

**Account**

    GET /accounts/:accountName/balance
    POST /accounts/:accountName/topups

## Environment Variables

**BASE_PATH**

Set this up when base path is required at code level, for example when setting mapping on API Gateway to map www.example.com/basePath to a lambda function.

e.g. Setting up hedwig.freshturf.io/test to point to this lambda's dev stage

## Input validation and sanitization

**express-validator**

Used for sanitization only, even though it's validation middleware proves to provide a better-structured and cleaner code, until the response can be tweaked to fit our needs, validation middleware is still coded.

**validator.js**

Used for the validation middelware.

## CI/CD Pipeline

CI/CD is set up on AWS Code Pipeline.

## Custom domain name for AWS API Gateway

- Using Route53 to set up custom domain name is probably easier but currently CloudFlare is used.
- Certificate in AWS Certificat Manager needs to be in the same region if the Endpoint Type is set to regional.
- There's no need to run sls create_domain if domain has been created on AWS API Gateway.
- CNAME has to be created before sls deploy for this to work (obviously by easily forgotten).
- CloudFlare can't support more than one level of subdomain names, e.g. \*.\*.example.com will not work. In fact, there isn't really a need to set up custom domain mapping in serverless.yml since it doesn't change frequently, but still did so for better visibility.
- Reference: https://tylerzey.com/cloudflare-in-front-of-lambda-api-gateway/
