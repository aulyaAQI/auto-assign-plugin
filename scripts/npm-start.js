/* eslint-disable no-undef */
import runAll from 'npm-run-all';

runAll(['develop', 'upload'], {
  parallel: true,
  stdout: process.stdout,
  stdin: process.stdin,
}).catch(({ results }) => {
  results
    .filter(({ code }) => code)
    .forEach(({ name }) => {
      console.log(`"npm run ${name}" was failed`);
    });
});
