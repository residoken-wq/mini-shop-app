import { getUsers } from "./actions";
import UsersClient from "./users-client";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="h-full">
            <UsersClient initialUsers={users} />
        </div>
    );
}
