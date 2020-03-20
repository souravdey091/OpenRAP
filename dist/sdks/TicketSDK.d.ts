export declare class TicketSDK {
    private networkSDK;
    private systemSDK;
    private deviceSDK;
    private apiKey;
    constructor();
    createTicket(ticketReq: ITicketReq): Promise<{
        message: string;
        code: string;
        status: number;
    }>;
}
export interface ITicketReq {
    email: string;
    description: string;
}
