import {DataTypes} from 'sequelize';

const defineDomain = (sequelize) => {
    const Domain = sequelize.define('Domain',
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
    return Domain;
};

export default defineDomain;

// TODO domain has Many Keys

/*
name: "positron-it.de"
cert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem"
key:  "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem"
*/