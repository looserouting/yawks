/*
Table KeyVersions {
  key_version_id integer [pk, not null]
  email VARCHAR(255) [not null, ref: > EmailAddresses.email] // Verweis auf die E-Mail-Adresse
  key_id integer [not null, ref: > keys.key_id]
  status VARCHAR(20) [not null, default: 'pending_activation',
    check: "status IN ('active', 'pending_activation', 'archived', 'rejected')"]
  activation_date TIMESTAMP
  deactivation_date TIMESTAMP
}
*/

import { DataTypes } from 'sequelize';

const defineKeyVersions = (sequelize) => {
  const KeyVersions = sequelize.define('KeyVersions', {
    key_version_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'EmailAddresses',
        key: 'email',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    key_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'keys',
        key: 'key_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending_activation',
      validate: {
        isIn: [['active', 'pending_activation', 'archived', 'rejected']],
      },
    },
    activation_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deactivation_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'KeyVersions',
    timestamps: false,
    // Optionally, add model-level check constraint if your DB supports it:
    // hooks: {
    //   beforeValidate: (instance) => {
    //     if (!['active', 'pending_activation', 'archived', 'rejected'].includes(instance.status)) {
    //       throw new Error('Invalid status value');
    //     }
    //   }
    // }
  });

  return KeyVersions;
};

export default defineKeyVersions;