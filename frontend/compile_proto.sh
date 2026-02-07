export PATH=$PATH:./node_modules/.bin
protoc --ts_proto_opt=outputServices=grpc-js --ts_proto_out=. ./src/libresvip.proto
