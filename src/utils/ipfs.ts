import axios from "axios";
export function uploadFile(form: any) {
  return axios
    .post("http://localhost:5040/upload", form, {
      headers: {
        ...form.getHeaders(),
      },
    })
    .then((res) => res.data);
}

export function createMetadata(data: any) {
  return axios
    .post("http://localhost:5040/metadata", data)
    .then((res) => res.data);
}
