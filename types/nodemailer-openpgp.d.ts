declare module 'nodemailer-openpgp' {
    export function openpgpEncrypt(options: any): Promise<any>;
    export { Encrypter };
}