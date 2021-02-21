export class Message {
  content: string;
  params: any[];
  isBroadcast: boolean;
  sender: string;
  constructor(
    content: string,
    params: any[],
    isBroadcast: boolean,
    sender: string
  ) {
    this.content = content;
    this.params = params;
    this.isBroadcast = isBroadcast;
    this.sender = sender;
  }
}
