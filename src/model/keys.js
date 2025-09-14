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