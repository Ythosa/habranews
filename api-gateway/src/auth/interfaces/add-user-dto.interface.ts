export interface AddUserDtoImpl {
    email: string;
    hashedPassword: string;
    salt: string;
    name: string;
    surname: string;
    tags: string[];
}
