import { createUser, getUserByUsername, saveCredential,getCredentialsForUser, getCredentialsForId, updateCounter, getUserById, logAttempt} from './src/db/index.js';



createUser({ id: 'abc123', username: 'alice', display_name: 'Alice' });

console.log(getUserByUsername('alice'));    // should print the row

console.log(getUserByUsername('nobody'));   // should print null

console.log(saveCredential({
  credential_id: 'cred-1',
  user_id: 'abc123',                       // alice's id from createUser above
  public_key: new Uint8Array([1, 2, 3]),   // fake key, just to test storage
  counter: 0,
  transports: ['internal'],
}));

console.log(getCredentialsForUser('abc123'));   // array with 1 credential
console.log(getCredentialsForUser('nobody'));   // []
console.log(updateCounter('cred-1', 5));        // true  (0 → 5)
console.log(updateCounter('cred-1', 3));        // false (3 is lower: replay!)
console.log(updateCounter('cred-1', 5));        // false (not higher)

console.log(getUserById('abc123'));   // alice's row
console.log(logAttempt({ username: 'alice', method: 'passkey', outcome: 'success', detail: 'test' }));   // true

