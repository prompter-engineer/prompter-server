# Prompter

## Introduction
Prompter is an open-sourced application built with Node.js and Express, which is designed to optimize prompts efficiently as the alternative to [the OpenAI Playground](https://platform.openai.com/playground).

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
What things you need to install the software and how to install them:
- Node.js
- npm/yarn (package manager)
- MongoDB (database)
- AWS SES (email service)
- Google Analytics (analytics service)
- Google Auth (user login)
- Stripe (payment)

### Installing
A step-by-step series of examples that tell you how to get a development environment running.

1. Clone the repo:
   ```bash
   git clone git@github.com:prompter-engineer/prompter-server.git
   ```

2. Navigate to the project directory:
   ```bash
   cd prompter-server
   ```

3. Rename `.env.example` to `.env` and fill in the configuration accordingly:
   ```bash
   mv .env.example .env
   vi .env
   ```

4. Install dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

5. Local running:
   ```bash
   npm dev
   ```
   or
   ```bash
   yarn dev
   ```

6. The server should now be running at http://localhost:[port].

## License
This project is licensed under the MIT License.

