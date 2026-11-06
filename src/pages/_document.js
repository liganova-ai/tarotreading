import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class OracleDocument extends Document {
  static async getInitialProps(ctx) {
    const props = await Document.getInitialProps(ctx);
    return { ...props, nonce: ctx.req?.headers['x-nonce'] };
  }
  render() {
    return <Html lang="en"><Head nonce={this.props.nonce} /><body><Main /><NextScript nonce={this.props.nonce} /></body></Html>;
  }
}
