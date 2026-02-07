export PATH=$PATH:./node_modules/.bin
protoc --ts_proto_opt=outputServices=grpc-js --ts_proto_out=./src --python_aristaproto_opt=pydantic_dataclasses --python_aristaproto_out=../libresvip_tauri --proto_path=../ ../libresvip.proto
