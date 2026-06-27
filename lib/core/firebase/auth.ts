import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { app } from './firebase';

const auth: Auth = getAuth(app);

export { auth, GoogleAuthProvider };
export type { Auth };
