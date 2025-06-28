import { DataTypes } from 'sequelize';

const definePendingRequest = (sequelize) => {
  const pendingRequest = sequelize.define('pendingRequest', {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  });

  // You won't define associations here directly
  return pendingRequest;
};

export default definePendingRequest;