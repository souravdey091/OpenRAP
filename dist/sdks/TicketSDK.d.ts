export declare class TicketSDK {
    private networkSDK;
    private systemSDK;
    constructor();
    createTicket(req: ITicketReq): Promise<{
        message: string;
        code: string;
        status: number;
    } | any>;
}
export interface ITicketReq {
    email: string;
    description: string;
}
