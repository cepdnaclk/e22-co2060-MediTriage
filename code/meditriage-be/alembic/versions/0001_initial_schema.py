"""initial_schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-08

Creates all tables from scratch:
  - users
  - auths
  - patients
  - medical_encounters
  - triage_interactions
  - clinical_notes
  - consultation_rooms
  - room_memberships
  - consultation_messages
  - consultation_attachments
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ENUM TYPES ──────────────────────────────────────────────────────────
    userrole_enum = postgresql.ENUM('NURSE', 'DOCTOR', 'ADMIN', name='userrole', create_type=False)
    userrole_enum.create(op.get_bind(), checkfirst=True)

    gender_enum = postgresql.ENUM('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY', name='gender', create_type=False)
    gender_enum.create(op.get_bind(), checkfirst=True)

    encounterstatus_enum = postgresql.ENUM(
        'TRIAGE_IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETED',
        name='encounterstatus', create_type=False
    )
    encounterstatus_enum.create(op.get_bind(), checkfirst=True)

    sendertype_enum = postgresql.ENUM('AI', 'PATIENT', 'NURSE', name='sendertype', create_type=False)
    sendertype_enum.create(op.get_bind(), checkfirst=True)

    roomstatus_enum = postgresql.ENUM('OPEN', 'CLOSED', name='roomstatus', create_type=False)
    roomstatus_enum.create(op.get_bind(), checkfirst=True)

    messagetype_enum = postgresql.ENUM('TEXT', 'SYSTEM', 'ATTACHMENT', name='messagetype', create_type=False)
    messagetype_enum.create(op.get_bind(), checkfirst=True)

    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('role', sa.Enum('NURSE', 'DOCTOR', 'ADMIN', name='userrole'), nullable=False),
        sa.Column('license_number', sa.String(50), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # ── auths ────────────────────────────────────────────────────────────────
    op.create_table(
        'auths',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True, nullable=False),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_auths_user_id', 'auths', ['user_id'])
    op.create_index('ix_auths_username', 'auths', ['username'])
    op.create_index('ix_auths_email', 'auths', ['email'])

    # ── patients ─────────────────────────────────────────────────────────────
    op.create_table(
        'patients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('national_id', sa.String(20), unique=True, nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('gender', sa.Enum('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY', name='gender'), nullable=True),
        sa.Column('contact_number', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_patients_national_id', 'patients', ['national_id'])

    # ── medical_encounters ───────────────────────────────────────────────────
    op.create_table(
        'medical_encounters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('nurse_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.Enum('TRIAGE_IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETED', name='encounterstatus'), nullable=False),
        sa.Column('is_urgent', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('chief_complaint', sa.String(500), nullable=True),
        sa.Column('encounter_timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_medical_encounters_patient_id', 'medical_encounters', ['patient_id'])
    op.create_index('ix_medical_encounters_nurse_id', 'medical_encounters', ['nurse_id'])
    op.create_index('ix_medical_encounters_doctor_id', 'medical_encounters', ['doctor_id'])

    # ── triage_interactions ──────────────────────────────────────────────────
    op.create_table(
        'triage_interactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('encounter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medical_encounters.id'), nullable=False),
        sa.Column('sender_type', sa.Enum('AI', 'PATIENT', 'NURSE', name='sendertype'), nullable=False),
        sa.Column('message_content', sa.Text(), nullable=False),
        sa.Column('audio_url', sa.String(500), nullable=True),
        sa.Column('transcription_confidence', sa.Float(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_triage_interactions_encounter_id', 'triage_interactions', ['encounter_id'])

    # ── clinical_notes ───────────────────────────────────────────────────────
    op.create_table(
        'clinical_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('encounter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medical_encounters.id'), unique=True, nullable=False),
        sa.Column('subjective', sa.Text(), nullable=True),
        sa.Column('objective', sa.Text(), nullable=True),
        sa.Column('assessment', sa.Text(), nullable=True),
        sa.Column('plan', sa.Text(), nullable=True),
        sa.Column('is_finalized', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_clinical_notes_encounter_id', 'clinical_notes', ['encounter_id'])

    # ── consultation_rooms ───────────────────────────────────────────────────
    op.create_table(
        'consultation_rooms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('encounter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medical_encounters.id'), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'CLOSED', name='roomstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_consultation_rooms_encounter_id', 'consultation_rooms', ['encounter_id'])

    # ── room_memberships ─────────────────────────────────────────────────────
    op.create_table(
        'room_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultation_rooms.id'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('added_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint('room_id', 'doctor_id', name='uq_room_doctor'),
    )
    op.create_index('ix_room_memberships_room_id', 'room_memberships', ['room_id'])
    op.create_index('ix_room_memberships_doctor_id', 'room_memberships', ['doctor_id'])

    # ── consultation_messages ────────────────────────────────────────────────
    op.create_table(
        'consultation_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultation_rooms.id'), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.Enum('TEXT', 'SYSTEM', 'ATTACHMENT', name='messagetype'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_consultation_messages_room_id', 'consultation_messages', ['room_id'])
    op.create_index('ix_consultation_messages_sender_id', 'consultation_messages', ['sender_id'])

    # ── consultation_attachments ─────────────────────────────────────────────
    op.create_table(
        'consultation_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultation_messages.id'), unique=True, nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultation_rooms.id'), nullable=False),
        sa.Column('uploader_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('stored_filename', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_consultation_attachments_message_id', 'consultation_attachments', ['message_id'])
    op.create_index('ix_consultation_attachments_room_id', 'consultation_attachments', ['room_id'])


def downgrade() -> None:
    op.drop_table('consultation_attachments')
    op.drop_table('consultation_messages')
    op.drop_table('room_memberships')
    op.drop_table('consultation_rooms')
    op.drop_table('clinical_notes')
    op.drop_table('triage_interactions')
    op.drop_table('medical_encounters')
    op.drop_table('patients')
    op.drop_table('auths')
    op.drop_table('users')

    # Drop ENUM types
    for enum_name in ['messagetype', 'roomstatus', 'sendertype', 'encounterstatus', 'gender', 'userrole']:
        op.execute(f'DROP TYPE IF EXISTS {enum_name}')
