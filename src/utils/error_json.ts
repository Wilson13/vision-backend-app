export default function (status: number, msg: string, data: object): object {
  return {
    status: status,
    message: msg,
    data: data,
  };
}
