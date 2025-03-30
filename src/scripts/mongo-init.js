// Create admin user first
db = db.getSiblingDB('admin')
db.createUser({
  user: 'admin',
  pwd: 'password123',
  roles: ['root']
})

// Authenticate as admin
db.auth('admin', 'password123')

// Create bsc_sniper database and user
db = db.getSiblingDB('bsc_sniper')
db.createUser({
  user: 'bsc_sniper_user',
  pwd: 'bsc_sniper_password',
  roles: [
    {
      role: 'readWrite',
      db: 'bsc_sniper'
    }
  ]
})

// Create a test collection to verify the database is working
db.createCollection('test') 