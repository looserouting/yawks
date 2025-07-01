/*
        fingerprint: { type: DataTypes.STRING(40), allowNull: false, unique: true },
        email: { type: DataTypes.STRING, allowNull: false,}
        wkdHash: { type: DataTypes.STRING, allowNull: false },
        domain: { type: DataTypes.STRING, allowNull: false },
        key: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.ENUM('pending','published'), defaultValue: 'pending'},
        activation_date: { type: DataTypes.DATE, allowNull: true, },
        token: { type: DataTypes.STRING(32), allowNull: false, unique: true }
*/

import {DataTypes} from 'sequelize';

const defineKeys = (sequelize) => {
    const Key = sequelize.define('Keys', 
    {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        wkdHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        domain: {
            type: DataTypes.STRING,
            allowNull: false
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending','published'),
            defaultValue: 'pending',
        },
        fingerprint: {
            type: DataTypes.STRING(40),
            allowNull: false,
            primaryKey: true,
            validate: {
                is: /^[A-F0-9]{40}$/i // Validates a 40-character hexadecimal string
            }
        },
        activation_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        token: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
        }
    });

    return Key;
};

export default defineKeys;