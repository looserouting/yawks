/*
Table EmailAddresses {
  email VARCHAR(255) [pk, not null] // Die E-Mail-Adresse ist jetzt der primäre Schlüssel
  wkd_hash VARCHAR(64) [unique, not null]
}
  */

import { DataTypes } from 'sequelize';

const defineEmailAddresses = (sequelize) => { 
  const EmailAddresses = sequelize.define('EmailAddresses', {
    email: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
      validate: {
        isEmail: true,
        len: [1, 255],
      },
      comment: 'Die E-Mail-Adresse ist jetzt der primäre Schlüssel',
    },
    wkd_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'WKD Hash, eindeutig und nicht null',
      validate: {
        len: [1, 64],
      },
    },
  }, {
    tableName: 'EmailAddresses',
    timestamps: false,
  });

  return EmailAddresses;
};

export default defineEmailAddresses;