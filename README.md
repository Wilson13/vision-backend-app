## Name

Stlog Notification Service

## Description

This service provides SMS and Email service to other microservices.

It has debit, credit, and logging built in to track consumption and top-ups.

## API

Whenever 'accountName' is required, there's only two options now: emart or ats.

    POST    /notifications
    GET     /accounts/:accountName/balance
    POST    /accounts/:accountName/topups

## Input validation and sanitization

- **express-validator** is used for sanitization only, even though it's validation middleware proves to provide a better structured and cleaner code, until the response can be tweaked to fit our needs, validation middle ware is still coded.

- **validator.js** is used for the validation middelware.

## More

- CI/CD is set up on AWS Code Pipeline.
- AWS credential profile used: ats-developer
