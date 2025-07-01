/*
Table Requests {
  request_id integer [pk, not null]
  email VARCHAR(255) [ref: > EmailAddresses.email] // Verweis auf die E-Mail-Adresse
  token Char(32)
  requested_key_id integer [ref: > Keys.id]
  request_type VARCHAR(20) [not null,
    check: "request_type IN ('new_registration', 'key_update', 'key_deletion')"]
  status VARCHAR(20) [not null, default: 'pending',
    check: "status IN ('pending', 'approved', 'rejected', 'cancelled')"]
  verification_token VARCHAR(255) [unique]
  processed_at TIMESTAMP
}
*/



import { DataTypes } from 'sequelize';

const defineRequest = (sequelize) => {
  const Request = sequelize.define('Request', {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      // Fremdschlüssel zu EmailAddresses.email (Association separat)
    },
    token: {
      type: DataTypes.CHAR(32),
      allowNull: true,
    },
    requested_key_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Fremdschlüssel zu Keys.id (Association separat)
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'approved', 'rejected', 'cancelled']],
      },
    },
    verification_token: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'Requests'
  });

  return Request;
};

export default defineRequest;