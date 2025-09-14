/*
Table Keys {
  key_id INTEGER [pk, not null]
  fingerprint unique VARCHAR(40) [unique, not null]
  full_key_data TEXT [not null] // Oder BLOB, je nach DB-System und Präferenz
}
*/

import {DataTypes} from 'sequelize';

const defineKeys = (sequelize) => {
    const Keys = sequelize.define('Keys', 
    {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        wkdHash: {
            primaryKey: true,
            type: DataTypes.STRING,
            allowNull: false
        },
        domain: {
            type: DataTypes.STRING,
            allowNull: false
        },
        publickey: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending','published'),
            allowNull: false
        },
        fingerprint: {
            type: DataTypes.STRING,
            allowNull: false
        },
        keycreationtime: {
            primaryKey: true,
            type: DataTypes.DATE,
            allowNull: false
        },
    });

    return Keys;
};

export default defineKeys;