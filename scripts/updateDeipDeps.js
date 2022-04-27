/* eslint-disable */
const inquirer = require('inquirer');
const execa = require('execa');
/* eslint-enable */

const prompt = inquirer.createPromptModule();

prompt([{
  type: 'list',
  name: 'update',
  message: 'This will update all @deip dependencies',
  default: [1],
  choices: [
    {
      value: 1,
      name: 'Yes. I understand.'
    },
    {
      value: 0,
      name: 'Cancel'
    }
  ]
}])
  .then(async (answer) => {
    if (!answer.update) {
      process.exit();
    }

    await execa.command('npx ncu "/^@(deip|casimir)\\/.*$/" -u', { stdio: 'inherit', shell: true });
    await execa.command('npm i', { stdio: 'inherit', shell: true });
    process.exit();
  });
