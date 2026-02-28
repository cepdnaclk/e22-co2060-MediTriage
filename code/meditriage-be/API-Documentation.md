# MediTriage API Documentation

This document provides a comprehensive reference for the MediTriage backend API, designed for both frontend and backend developers.

## Base URL
`http://localhost:8000/api/v1`

## Authentication
All protected routes require a Bearer Token in the `Authorization` header.
`Authorization: Bearer <your_access_token>`

---

## 1. Authentication & User Profile

### Register User
- **Method**: `POST`
- **Path**: `/auth/register`
- **Description**: Creates a new user account (Nurse or Doctor).
  - *Validation*: Username (3-50 chars), Email (valid format), Password (min 8 chars), Full Name (1-255 chars).
- **Body**:
  ```json
  {
    "username": "<your_username>",
    "email": "<your_email>",
    "password": "<your_password>",
    "full_name": "<your_full_name>",
    "role": "NURSE",
    "license_number": "<your_license_number>"
  }
  ```
- **Success Response**: `201 Created`

### Login
- **Method**: `POST`
- **Path**: `/auth/login`
- **Description**: Authenticates user and returns a JWT access token.
- **Body**:
  ```json
  {
    "username": "<your_username>",
    "password": "<your_password>"
  }
  ```
- **Success Response**: `200 OK` with `access_token`.

### Get Current User
- **Method**: `GET`
- **Path**: `/auth/me`
- **Description**: Retrieves details of the currently authenticated user.
- **Authentication**: Required.

### Update Own Profile
- **Method**: `PATCH`
- **Path**: `/auth/me`
- **Description**: Allows updating `full_name` and `license_number`.
- **Authentication**: Required.

---

## 2. Patient Management

### Create Patient
- **Method**: `POST`
- **Path**: `/patients`
- **Description**: Registers a new patient record.
  - *Validation*: National ID (9-20 chars), First/Last Name (1-100 chars).
- **Required Role**: Nurse or Admin.
- **Body**:
  ```json
  {
    "national_id": "<nic_number>",
    "first_name": "<first_name>",
    "last_name": "<last_name>",
    "date_of_birth": "<yyyy-mm-dd>",
    "gender": "MALE",
    "contact_number": "<phone_number>"
  }
  ```

### Search Patients
- **Method**: `GET`
- **Path**: `/patients/search`
- **Description**: Search by `nic` (exact) or `name` (partial). At least one parameter is required.
- **Required Role**: Nurse or Doctor.
- **Query Params**: `nic=<nic_number>` OR `name=<partial_name>`.

### Get Patient Details
- **Method**: `GET`
- **Path**: `/patients/{patient_id}`
- **Description**: Retrieves record for a specific patient.

### Update Patient
- **Method**: `PUT`
- **Path**: `/patients/{patient_id}`
- **Description**: Updates patient information.

### Get Patient History
- **Method**: `GET`
- **Path**: `/patients/{patient_id}/history`
- **Description**: List of all past triage encounters.

---

## 3. Triage & Clinical Operations

### Start Triage Interview
- **Method**: `POST`
- **Path**: `/triage/start`
- **Description**: Initiates a new AI-led triage session.
- **Required Role**: Nurse.
- **Body**: `{ "patient_id": "..." }`
- **Response**: Returns `encounter_id` and initial AI greeting.

### Send Chat Message
- **Method**: `POST`
- **Path**: `/triage/chat`
- **Description**: Processes a patient's response and returns the next AI question.
- **Required Role**: Nurse.
- **Body**: `{ "encounter_id": "...", "message": "..." }`

### Get Chat Messages
- **Method**: `GET`
- **Path**: `/triage/{encounter_id}/messages`
- **Description**: Retrieves full chat history for an encounter.

### Update Urgency
- **Method**: `PATCH`
- **Path**: `/triage/{encounter_id}`
- **Description**: Manually flag an encounter as urgent.
- **Required Role**: Nurse.
- **Body**: `{ "is_urgent": true }`

### Get SOAP Note
- **Method**: `GET`
- **Path**: `/triage/{encounter_id}/note`
- **Description**: Retrieves the clinical (SOAP) note for the encounter.

### Update Clinical Note
- **Method**: `PUT`
- **Path**: `/triage/{encounter_id}/note`
- **Description**: Allows a doctor to edit and finalize the SOAP note.
- **Required Role**: Doctor.

---

## 4. Admin & Health

### List Users
- **Method**: `GET`
- **Path**: `/users`
- **Description**: Browse user accounts.
- **Required Role**: Admin.

### Deactivate User
- **Method**: `DELETE`
- **Path**: `/users/{user_id}`
- **Description**: Disables a user account.
- **Required Role**: Admin.

### Health Check
- **Method**: `GET`
- **Path**: `/`
- **Description**: Returns status of the API server.
