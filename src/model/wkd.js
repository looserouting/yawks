import {DataTypes} from 'sequelize';

const defineWkd = (sequelize) => {
    const Wkd = sequelize.define('Wkd',
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        cert: {
            type: DataTypes.STRING,
        },
        privateKey: {
            type: DataTypes.STRING,
        },
    });
    return Wkd;
};

export default defineWkd;

// TODO domain has Many Keys

/*
name: "positron-it.de"
cert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem"
key:  "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem"
*/