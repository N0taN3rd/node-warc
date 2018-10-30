/// <reference types="node" />
/// <reference types="puppeteer" />
import {ReadStream} from "fs";
import {Gunzip} from "zlib";
import {Transform} from "stream";
import {URL} from 'url';
import {EventEmitter} from 'eventemitter3';
import {Page, Request, CDPSession} from "puppeteer";

export class AutoWARCParser extends EventEmitter {
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    _getStream(): ReadStream | Gunzip;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCGzParser extends EventEmitter {
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCParser extends EventEmitter {
    constructor(wp?: string);
    start(): boolean;
    parseWARC(wp?: string): boolean;
    _onRecord(record: WARCRecord): void;
    _onEnd(): void;
    _onError(error: Error): void;
    on(event: 'record', cb: (record: WARCRecord) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: 'done', cb: () => any): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<WARCRecord>
}

export class WARCStreamTransform extends Transform {
    _consumeChunk(chunk: Buffer, done: () => void, pushLast?: boolean): void;
    _transform(buf: Buffer, enc: string, done: () => void): void;
    _flush(done: () => void): void;
}

export function recordIterator(warcStream: ReadStream | Gunzip): AsyncIterableIterator<WARCRecord>;

export interface WARCRecordParts {
    header: Buffer;
    c1: Buffer;
    c2: Buffer;
}

export interface RequestHTTPInfo {
    requestLine: string;
    path: string;
    method: string;
    httpVersion: string;
    headers: Object;
}

export interface ResponseHTTPInfo {
    statusLine: string;
    statusCode: string;
    statusReason: string;
    httpVersion: string;
    headers: Object;
}

export class WARCRecord {
    warcHeader: Object;
    httpInfo?: RequestHTTPInfo | ResponseHTTPInfo;
    content: Buffer;
    warcType: string;
    warcRecordID: string;
    warcDate: string;
    warcContentLength: string;
    warcContentType: string;
    warcConcurrentTo: string;
    warcBlockDigest?: string;
    warcPayloadDigest?: string;
    warcIPAddress?: string;
    warcRefersTo?: string;
    warcRefersToTargetURI?: string;
    warcRefersToDate?: string;
    warcTargetURI: string;
    warcTruncated?: string;
    warcWarcinfoID?: string;
    warcFilename?: string;
    warcProfile?: string;
    warcIdentifiedPayloadType?: string;
    warcSegmentOriginID?: string;
    warcSegmentNumber?: string;
    warcSegmentTotalLength?: string;
    constructor (warcParts: WARCRecordParts);
    hasWARCHeader(headerKey: string): boolean;
    getWARCHeader(headerKey: string): string | undefined;
}

export class RecordBuilder {
    buildRecord(): WARCRecord | null;
    consumeLine(line: Buffer): WARCRecord | null;
}

export class WARCWriterBase extends EventEmitter {
    initWARC (warcPath: string, options): void;
    writeWarcInfoRecord (isPartOfV: string, warcInfoDescription: string, ua: string): Promise<void>;
    writeWarcMetadataOutlinks (targetURI: string, outlinks: string): Promise<void>;
    writeWarcMetadata (targetURI: string, metaData: Buffer | string): Promise<void>;
    writeRequestRecord (targetURI: string, httpHeaderString: string, requestData: string | Buffer): Promise<void>;
    writeResponseRecord (targetURI: string, httpHeaderString: string, requestData: string | Buffer): Promise<void>;
    writeRecordBlock (targetURI: string, httpHeaderString: string, requestData: string | Buffer): Promise<void>;
    writeRecordChunks (targetURI: string, httpHeaderString: string, requestData: string | Buffer): Promise<void>;
    end(): Promise<void>;
    _onFinish(): void;
    _onError(error: Error): void;
    on(event: 'finished', cb: (error?: Error) => any): this;
    on(event: 'error', cb: (error: Error) => any): this;
    on(event: string, cb?: (...args: any[]) => any): this;
}

export class PuppeteerWARCGenerator extends WARCWriterBase {
    generateWarcEntry (request: Request): Promise<void>;
}

export class ElectronWARCGenerator extends WARCWriterBase {
    generateWarcEntry (nreq: CDPRequestInfo, wcDebugger: Object): Promise<void>;
}

export class PuppeteerCDPWARCGenerator extends WARCWriterBase {
    generateWarcEntry (nreq: CDPRequestInfo, client: CDPSession): Promise<void>;
}

export class RemoteChromeWARCGenerator extends WARCWriterBase {
    generateWarcEntry (nreq: CDPRequestInfo, network: Object): Promise<void>;
}


export class ElectronRequestCapturer extends RequestHandler {
    attach (wcDebugger: Object): void;
    maybeNetworkMessage(method: string, params: string): void;
}

export class PuppeteerRequestCapturer {
    constructor (page: Page);
    startCapturing(): void;
    stopCapturing(): void;
    requestWillBeSent(r: Request): void;
    iterateRequests(): Iterator<Request>;
    requests(): Array<Request>;
    [Symbol.iterator](): Iterator<Request>;
}

export class PuppeteerCDPRequestCapturer extends RequestHandler {
    constructor (client?: CDPSession);
    attach(client: CDPSession);
}

export class RemoteChromeRequestCapturer extends RequestHandler {
    constructor(network: Object);
}

export class RequestHandler {
    startCapturing(): void;
    stopCapturing(): void;
    addRequestInfo(info: Object): void;
    clear(): void;
    size(): number;
    entries(): Iterator<[string, CapturedRequest]>;
    values(): Iterator<CapturedRequest>;
    keys(): Iterator<string>;
    forEach(iteratee: (entry: [string, CapturedRequest]) => any, thisArg?: any): void;
    requestWillBeSent(info: Object): void;
    responseReceived(info: Object): void;
    iterateRequests(): Iterator<CDPRequestInfo>;
    [Symbol.iterator](): Iterator<[string, CapturedRequest]>;
}


export class CapturedRequest {
    constructor(info: Object);
    addRequestInfo(info: Object): void;
    url(): string | Array<string>;
    keys(): Iterator<string>;
    values(): Iterator<CDPRequestInfo>;
    static newOne(info: Object): CapturedRequest;
    [Symbol.iterator](): Iterator<CDPRequestInfo>;
}

export class CDPRequestInfo {
    addResponse(res: Object, not3xx?: boolean): void;
    getParsedURL(): URL;
    serializeRequestHeaders(): string;
    serializeResponseHeaders(): string;
    canSerializeResponse(): boolean;
    _serializeRequestHeadersText(): string;
    _serializeRequestHeadersObj(): string;
    _getReqHeaderObj(): Object | null;
    _ensureProto(): void;
    _checkMethod(): void;
    _methProtoFromReqHeadText(): void;
    _correctProtocol(originalProtocol: string): string;
    static fromRedir(info: Object): CDPRequestInfo;
    static fromResponse(info: Object): CDPRequestInfo;
}