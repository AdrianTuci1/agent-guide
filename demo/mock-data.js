function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const flows = {
  async refactor(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Help me refactor the auth module', 'user');
    await delay(400);

    chat.setRenderMode('thinking');
    await delay(1500);
    chat.setRenderMode(null);

    chat.addRichMessage(`<p>I read <strong>auth.js</strong>, <strong>login.js</strong> and <strong>session.js</strong>. There are two sensible approaches:</p>
<ul>
  <li><strong>Quick fix</strong> — patch the validation logic in place.</li>
  <li><strong>Full refactor</strong> — extract a dedicated <code>AuthService</code> and update callers.</li>
  <li><strong>Ask more</strong> — dig into edge cases first.</li>
</ul>`);

    chat.showVariants('Choose approach', [
      '1. Quick fix: minimal changes',
      '2. Full refactor: extract a service',
      '3. Ask me more questions'
    ], async (choice) => {
      chat.addMessage(choice, 'user');

      chat.setRenderMode('searching');
      await delay(1000);
      chat.addToolCall('read_file', { path: 'src/auth.js' }, '32 lines read');
      chat.addToolCall('read_file', { path: 'src/login.js' }, '48 lines read');
      chat.setRenderMode('generating');
      await delay(1200);
      chat.setRenderMode(null);

      chat.addCodeChangeCard('Generated AuthService and updated callers', [
        {
          path: 'src/auth-service.js',
          mode: 'created',
          content: `export class AuthService {
  constructor(tokenStore) {
    this.tokenStore = tokenStore;
  }

  async login(email, password) {
    const user = await this.validateCredentials(email, password);
    if (!user) throw new AuthError('Invalid credentials');
    return this.tokenStore.issue(user);
  }
}`
        },
        {
          path: 'src/login.js',
          mode: 'modified',
          content: `import { AuthService } from './auth-service';

const auth = new AuthService(tokenStore);
await auth.login(email, password);`
        },
        {
          path: 'src/session.js',
          mode: 'modified',
          content: `import { AuthService } from './auth-service';

const auth = new AuthService(tokenStore);`
        }
      ]);

      chat.addRichMessage(`<p>I generated <code>src/auth-service.js</code> and updated the callers in <code>login.js</code> and <code>session.js</code>. Ready to run tests?</p>`);

      chat.showConfirmation('Run tests before applying changes?', 'Run the test suite to validate the generated changes before applying them.', ['Run tests', 'Edit plan', 'Cancel'], async (action) => {
        chat.addMessage(action, 'user');
        if (action === 'Run tests') {
          chat.setRenderMode('running');
          await delay(1500);
          chat.addToolCall('run_shell', { command: 'npm test' }, 'Tests passed: 12/12');
          chat.setRenderMode(null);
          chat.addRichMessage(`<p>All tests passed. <strong>Summary:</strong></p>
<ul>
  <li>Extracted <code>AuthService</code></li>
  <li>Updated 2 callers</li>
  <li>12/12 tests green</li>
</ul>`);
          chat.showConfirmation('Apply the changes?', 'Apply the changes?', ['Apply', 'Review diff', 'Cancel'], (a) => {
            chat.addMessage(a, 'user');
            chat.addMessage(a === 'Apply' ? 'Changes applied.' : 'Waiting for your review.', 'agent');
            chatWindow.composer.setDefault(() => {});
          });
        } else {
          chat.addMessage('Flow paused. Edit the plan and continue.', 'agent');
          chatWindow.composer.setDefault(() => {});
        }
      });
    });
  },

  async deploy(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Deploy the latest API to production', 'user');
    await delay(400);

    chat.setRenderMode('connecting');
    await delay(1200);
    chat.setRenderMode(null);

    chat.addRichMessage(`<p>Connecting to the production environment. I need a <strong>deploy token</strong> to call the deployment API.</p>`);
    chat.showSecret('Enter deploy token', 'production deployment API', async (token) => {
      chat.showConfirmation('Secrets provided', 'Secrets provided for production deployment API.', ['Continue'], async () => {
        chat.setRenderMode('running');
        await delay(1200);
        chat.addToolCall('run_shell', { command: 'deploy --env=prod' }, 'Deployment in progress...');
        chat.setRenderMode('syncing');
        await delay(1000);
        chat.setRenderMode(null);
        chat.addRichMessage(`<p>Deployment <strong>complete</strong>. Health checks passed:</p>
<ul>
  <li>API latency: 42ms</li>
  <li>Database migration: applied</li>
  <li>Smoke tests: 5/5</li>
</ul>`);
        chatWindow.composer.setDefault(() => {});
      });
    });
  },

  async image(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('What do you see in this screenshot?', 'user');
    await delay(400);

    chat.setRenderMode('analyzing-image');
    await delay(1500);
    chat.setRenderMode('thinking');
    await delay(1000);
    chat.setRenderMode(null);

    chat.addRichMessage(`<p>The screenshot shows a login form with an error banner: <code>Invalid credentials</code>.</p>
<p>Possible fixes:</p>
<ul>
  <li>Show a clearer error message</li>
  <li>Validate the email format before submitting</li>
  <li>Rate-limit failed attempts</li>
</ul>`);

    chat.showVariants('Pick next step', [
      'Show error handling code',
      'Validate form fields',
      'Generate a fix'
    ], (choice) => {
      chat.addMessage(choice, 'user');
      chat.addMessage('Great. I will open the relevant component and prepare a patch.', 'agent');
      chatWindow.composer.setDefault(() => {});
    });
  },

  async onboard(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Help me understand this repo', 'user');
    await delay(400);

    chat.setRenderMode('searching');
    await delay(1200);
    chat.addToolCall('read_file', { path: 'README.md' }, 'Project overview read');
    chat.addToolCall('read_file', { path: 'package.json' }, 'Dependencies read');
    chat.setRenderMode('thinking');
    await delay(1000);
    chat.setRenderMode(null);

    chat.addRichMessage(`<p>Here is what I found:</p>
<ul>
  <li><strong>Framework:</strong> React + Vite</li>
  <li><strong>Test runner:</strong> Vitest</li>
  <li><strong>Key entry:</strong> <code>src/main.tsx</code></li>
</ul>
<p>What would you like to do next?</p>`);

    chat.showVariants('Next step', [
      'Explore the component tree',
      'Run the test suite',
      'Add a new feature'
    ], (choice) => {
      chat.addMessage(choice, 'user');
      chat.addRichMessage(`<p>Sure. I'll start by reading the source tree and give you a compact map.</p>`);
      chatWindow.composer.setDefault(() => {});
    });
  },

  async configure(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Set up the deployment environment', 'user');
    await delay(400);

    chat.addRichMessage(`<p>Fill in the form below and I'll generate the deployment config.</p>`);
    chat.showForm('Environment settings', [
      { name: 'environment', label: 'Environment', type: 'select', options: ['staging', 'production'] },
      { name: 'region', label: 'Region', type: 'select', options: ['us-east-1', 'eu-west-1', 'ap-south-1'] },
      { name: 'apiKey', label: 'API key', type: 'password' }
    ], (data) => {
      chat.showConfirmation('Environment configured', `Config generated for ${data.environment} in ${data.region}. The API key is stored securely.`, ['Continue'], () => {
        chatWindow.composer.setDefault(() => {});
      });
    });
  },

  async confirm(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Delete the old feature branch', 'user');
    await delay(400);

    chat.setRenderMode('thinking');
    await delay(800);
    chat.setRenderMode(null);

    chat.showConfirmation('Delete branch?', 'This will delete refs/heads/old-auth-refactor locally and remotely. This action cannot be undone.', ['Delete', 'Cancel'], (action) => {
      if (action === 'Delete') {
        chat.setRenderMode('running');
        setTimeout(() => {
          chat.setRenderMode(null);
          chat.addToolCall('run_shell', { command: 'git push origin --delete old-auth-refactor' }, 'Branch deleted');
          chat.showConfirmation('Branch deleted', 'Branch deleted successfully.', ['Continue'], () => {
            chatWindow.composer.setDefault(() => {});
          });
        }, 1000);
      } else {
        chat.showConfirmation('Cancelled', 'Deletion cancelled.', ['Continue'], () => {
          chatWindow.composer.setDefault(() => {});
        });
      }
    });
  },

  async release(chatWindow) {
    const chat = chatWindow.chat;

    chat.addMessage('Release the new API version', 'user');
    await delay(400);

    chat.setRenderMode('planning');
    await delay(800);
    chat.setRenderMode(null);

    chat.addRichMessage(`<p>There are three actions needed before deployment. Each action will be enabled in turn.</p>`);

    chat.addActionList([
      { id: 'region', label: 'Select deployment region' },
      { id: 'token', label: 'Provide production deploy token' },
      { id: 'confirm', label: 'Confirm deployment' }
    ], {
      onActivate(index, itemEl, resolve) {
        if (index === 0) {
          new window.Composer(itemEl).showVariants('Select region', ['us-east-1', 'eu-west-1', 'ap-south-1'], (choice) => {
            resolve('done', `Region: ${choice}`);
          }, () => {
            resolve('canceled', 'Region selection cancelled');
          });
        } else if (index === 1) {
          new window.Composer(itemEl).showSecret('Enter production token', 'production deployment API', (value) => {
            resolve('done', 'Secrets provided for production deployment API');
          }, () => {
            resolve('canceled', 'Token input cancelled');
          });
        } else if (index === 2) {
          new window.Composer(itemEl).showConfirmation('Deploy to production?', 'This will release the API to the selected region. This action cannot be undone.', ['Deploy', 'Cancel'], (action) => {
            if (action === 'Deploy') {
              resolve('done', 'Deployment confirmed');
            } else {
              resolve('canceled', 'Deployment cancelled');
            }
          });
        }
      },
      async onComplete(status) {
        if (status === 'done') {
          chat.setRenderMode('running');
          await delay(1000);
          chat.addToolCall('deploy', { env: 'prod', region: 'us-east-1' }, 'Deployment in progress');
          await delay(1000);
          chat.setRenderMode(null);
          chat.addRichMessage(`<p>Deployment <strong>completed</strong> successfully.</p>`);
        } else {
          chat.addMessage('Deployment cancelled.', 'agent');
        }
        chatWindow.composer.setDefault(() => {});
      }
    });
  }
};

const flowMeta = {
  refactor: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['GitHub', 'Vitest', 'Warp'],
    cron: '0 9 * * 1-5'
  },
  deploy: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['AWS', 'GitHub Actions'],
    cron: '0 10 * * 1'
  },
  image: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['Vision API'],
    cron: '0 8 * * *'
  },
  onboard: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['GitHub', 'Warp'],
    cron: '0 9 * * 1-5'
  },
  configure: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['AWS', 'Vault'],
    cron: '0 6 * * *'
  },
  confirm: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['Git'],
    cron: '0 11 * * *'
  },
  release: {
    createdBy: 'Adrian Tucicovenco',
    integrations: ['GitHub', 'AWS', 'Slack'],
    cron: '0 14 * * 3'
  }
};

window.runFlow = function runFlow(chatWindow, id) {
  const flow = flows[id];
  if (flow) flow(chatWindow);
};
