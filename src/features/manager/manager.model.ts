export interface Role {
    role_id?: string;
    role_name: string;
    role_description:  string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface Permission {
    permission_id: string;
    permission_name: string;
    created_at?: Date;
}

export interface Role_Permission {
    role_id: string;
    permission_id: string;
}