import axios from 'axios'
import { Authenticator, AuthIdentity } from 'beland-crypto'
export function uploadFile(form: any, authIdentity: AuthIdentity) {
  const authLink = Authenticator.signPayload(authIdentity, 'post:/upload')
  return axios
    .post('https://nft-api-test.beland.io/v1/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + btoa(JSON.stringify(authLink))
      }
    })
    .then((res) => res.data)
}

export function createMetadata(data: any, authIdentity: AuthIdentity) {
  const authLink = Authenticator.signPayload(
    authIdentity,
    'post:/upload/metadata'
  )
  return axios
    .post('https://nft-api-test.beland.io/v1/upload/metadata', data, {
      headers: {
        Authorization: 'Bearer ' + btoa(JSON.stringify(authLink))
      }
    })
    .then((res) => res.data)
}
