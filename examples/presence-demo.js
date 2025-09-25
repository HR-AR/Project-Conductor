/**
 * Presence System Demo
 *
 * Demonstrates the user presence tracking functionality with Socket.io client
 */

const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const REQUIREMENT_ID = 'req-demo-123';

// Create multiple client connections to simulate users
const users = [
  { id: 'user1', name: 'Alice Developer' },
  { id: 'user2', name: 'Bob Tester' },
  { id: 'user3', name: 'Charlie PM' }
];

const clients = [];

function createUser(user) {
  console.log(`\n🔌 Connecting ${user.name}...`);

  const client = io(SERVER_URL);

  client.on('connect', () => {
    console.log(`✅ ${user.name} connected with socket ID: ${client.id}`);

    // Initialize user presence
    client.emit('user:initialize', {
      userId: user.id,
      username: user.name
    });
  });

  // Listen for presence events
  client.on('presence:initialized', (presence) => {
    console.log(`🎯 ${user.name} presence initialized:`, presence);

    // Join a requirement room
    setTimeout(() => {
      console.log(`📋 ${user.name} joining requirement ${REQUIREMENT_ID}`);
      client.emit('join-requirement', {
        requirementId: REQUIREMENT_ID,
        userId: user.id,
        username: user.name
      });
    }, 1000);
  });

  client.on('presence:list', (requirementPresence) => {
    console.log(`👥 ${user.name} received presence list:`, {
      requirementId: requirementPresence.requirementId,
      totalUsers: requirementPresence.totalUsers,
      users: requirementPresence.users.map(u => u.username),
      editingUsers: requirementPresence.editingUsers.map(u => u.username)
    });
  });

  client.on('presence:user-joined', (data) => {
    console.log(`🚪 ${user.name} sees ${data.user.username} joined requirement ${data.requirementId}`);
  });

  client.on('presence:user-left', (data) => {
    console.log(`👋 ${user.name} sees ${data.user.username} left requirement ${data.requirementId}`);
  });

  client.on('presence:editing-start', (data) => {
    console.log(`✏️  ${user.name} sees ${data.user.username} started editing requirement ${data.requirementId}`);
  });

  client.on('presence:editing-stop', (data) => {
    console.log(`⏹️  ${user.name} sees ${data.user.username} stopped editing requirement ${data.requirementId}`);
  });

  client.on('presence:status-change', (data) => {
    console.log(`🔄 ${user.name} sees ${data.user.username} status changed to ${data.user.status}`);
  });

  client.on('disconnect', () => {
    console.log(`❌ ${user.name} disconnected`);
  });

  return { user, client };
}

function simulateUserActivity(userClient, delay = 0) {
  const { user, client } = userClient;

  setTimeout(() => {
    // Start editing
    console.log(`\n🖊️  ${user.name} starts editing...`);
    client.emit('editing:start', {
      userId: user.id,
      requirementId: REQUIREMENT_ID
    });

    // Edit for a while then stop
    setTimeout(() => {
      console.log(`\n⏸️  ${user.name} stops editing...`);
      client.emit('editing:stop', {
        userId: user.id,
        requirementId: REQUIREMENT_ID
      });
    }, 3000);

  }, delay);
}

function runDemo() {
  console.log('🚀 Starting Presence System Demo');
  console.log('Make sure the server is running on http://localhost:3000\n');

  // Create user connections
  users.forEach((user, index) => {
    setTimeout(() => {
      const userClient = createUser(user);
      clients.push(userClient);

      // Schedule some editing activity
      simulateUserActivity(userClient, 5000 + (index * 2000));
    }, index * 1500);
  });

  // Check presence stats
  setTimeout(async () => {
    console.log('\n📊 Checking presence statistics...');
    try {
      const response = await fetch(`${SERVER_URL}/api/v1/presence/stats`);
      const stats = await response.json();
      console.log('Presence Stats:', JSON.stringify(stats, null, 2));
    } catch (error) {
      console.log('Error fetching stats:', error.message);
    }
  }, 8000);

  // Simulate user leaving
  setTimeout(() => {
    if (clients.length > 0) {
      const leavingUser = clients[1]; // Bob leaves
      console.log(`\n🚪 ${leavingUser.user.name} is leaving the requirement...`);
      leavingUser.client.emit('leave-requirement', REQUIREMENT_ID);

      // And then disconnects
      setTimeout(() => {
        console.log(`\n❌ ${leavingUser.user.name} is disconnecting...`);
        leavingUser.client.disconnect();
      }, 2000);
    }
  }, 12000);

  // Clean shutdown
  setTimeout(() => {
    console.log('\n🛑 Demo ending, disconnecting all clients...');
    clients.forEach(({ user, client }) => {
      console.log(`👋 Disconnecting ${user.name}`);
      client.disconnect();
    });
    process.exit(0);
  }, 18000);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the demo
runDemo();