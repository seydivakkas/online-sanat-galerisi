const sequelize = require('../config/database');

// SQLite Sequelize uses one connection for :memory: and often for file-backed
// development. Concurrent BEGINs on the same handle can invalidate BOTH
// transactions. Serialize inventory/state-changing transactions per Node
// process. PostgreSQL continues to arbitrate via conditional SQL UPDATEs.
let sqliteTail = Promise.resolve();

async function withInventoryTransaction(action) {
  if (sequelize.getDialect() !== 'sqlite') return sequelize.transaction(action);
  let unlock;
  const ticket = new Promise(resolve => { unlock = resolve; });
  const previous = sqliteTail;
  sqliteTail = ticket;
  await previous;
  try {
    return await sequelize.transaction(action);
  } finally {
    unlock(); // releases queue even on thrown errors or rollback
  }
}

module.exports = { withInventoryTransaction };
