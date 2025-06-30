/*
Table Keys {
  key_id INTEGER [pk, not null]
  fingerprint unique VARCHAR(40) [unique, not null]
  full_key_data TEXT [not null] // Oder BLOB, je nach DB-System und Präferenz
}
*/

import {DataTypes} from 'sequelize';

const defineKey = (sequelize) => {
    const Key = sequelize.define('Key', 
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
            allowNull: false
        },
    });

    return Key;
};

export default defineKey;