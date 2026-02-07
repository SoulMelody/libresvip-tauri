set PATH=%PATH%;%CD%\node_modules\.bin
protoc --ts_proto_opt=outputServices=grpc-js --ts_proto_out=. ./src/libresvip.proto