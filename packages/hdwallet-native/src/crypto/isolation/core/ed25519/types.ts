import * as core from "@shapeshiftoss/hdwallet-core"
import { Literal, Object as Obj, Static, Union } from "funtypes";
import { Ed25519 as IotaEd25519 } from "@iota/crypto.js";
import {FieldElement as IotaFieldElement} from "@iota/crypto.js/src/signatures/edwards25519/fieldElement";
import {CONST_D as IotaCONST_D} from "@iota/crypto.js/src/signatures/edwards25519/const";
import * as tinyecc from "tiny-secp256k1";
import bigInt, { BigInteger } from "big-integer";

const BN32_ZERO = new Uint8Array(32);

// https://en.wikipedia.org/wiki/EdDSA
// https://safecurves.cr.yp.to/base.html
// https://github.com/paulmillr/noble-ed25519/blob/main/index.ts
// BN32_N = l
const BN32_N = new Uint8Array([
  16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  20, 222, 249, 222, 162, 247, 156, 214, 88, 18, 99, 26, 92, 245, 211, 237
]);

function cmpBN32(data1: Uint8Array, data2: Uint8Array): number {
  for (let i = 0; i < 32; ++i) {
    if (data1[i] !== data2[i]) {
      return data1[i] < data2[i] ? -1 : 1;
    }
  }
  return 0;
}
class Ed25519 extends IotaEd25519 {
  // https://safecurves.cr.yp.to/base.html
  // https://monerodocs.org/cryptography/asymmetric/edwards25519/
  isPrivate(d: Buffer): boolean {
    return (
      //isUint8Array(x) && // no apply
      d.length === Ed25519.PRIVATE_KEY_SIZE &&
      cmpBN32(d, BN32_ZERO) > 0 &&
      cmpBN32(d, BN32_N) < 0
    )
  }
  pointCompress(A: Buffer, compressed: boolean): Buffer {

  }

  // https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/edwards.rs#L190
  decompress(bytes: Uint8Array) /* -> Option<EdwardsPoint> */{
    let Y = new IotaFieldElement(); Y.fromBytes(bytes);
    let Z = new IotaFieldElement(); Z.one();
    let YY = new IotaFieldElement(); YY.square(Y);
    let u = new IotaFieldElement(); u.sub(YY,Z);                            // u =  y²-1
    let v = new IotaFieldElement(); v.mul(YY, IotaCONST_D); v.add(v,Z);     // v = dy²+1
    let (is_valid_y_coord, mut X) = FieldElement::sqrt_ratio_i(&u, &v);

    if is_valid_y_coord.unwrap_u8() != 1u8 { return None; }

     // FieldElement::sqrt_ratio_i always returns the nonnegative square root,
     // so we negate according to the supplied sign bit.
    let compressed_sign_bit = Choice::from(self.as_bytes()[31] >> 7);
    X.conditional_negate(compressed_sign_bit);

    Some(EdwardsPoint{ X, Y, Z, T: &X * &Y })
  }
}

class IotaFieldElementExtended extends IotaFieldElement {
  // https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/field.rs#L229
  sqrt_ratio_i(u: IotaFieldElementExtended, v: IotaFieldElementExtended) {
    const v3 = v;
    v3.square(v3);
    v3.mul(v3,v);

    let v7 = v3;
    v7.square(v7);
    v7.mul(v7, v);

    let r = new IotaFieldElementExtended();
    r.mul(u, v7);
    r.pow_p58();
    r
    
    
    r.mul(u, v3);
    


    /*
    let mut r = &(u * &v3) * &(u * &v7).pow_p58();
    let check = v * &r.square();

    let i = &constants::SQRT_M1;

    let correct_sign_sqrt   = check.ct_eq(        u);
    let flipped_sign_sqrt   = check.ct_eq(     &(-u));
    let flipped_sign_sqrt_i = check.ct_eq(&(&(-u)*i));

    let r_prime = &constants::SQRT_M1 * &r;
    r.conditional_assign(&r_prime, flipped_sign_sqrt | flipped_sign_sqrt_i);

    // Choose the nonnegative square root.
    let r_is_negative = r.is_negative();
    r.conditional_negate(r_is_negative);

    let was_nonzero_square = correct_sign_sqrt | flipped_sign_sqrt;

    (was_nonzero_square, r)
    */
  }

  /// Compute (self^(2^250-1), self^11), used as a helper function
  /// within invert() and pow22523().
  pow22501(z: IotaFieldElementExtended) {
    // Instead of managing which temporary variables are used
    // for what, we define as many as we need and leave stack
    // allocation to the compiler
    //
    // Each temporary variable t_i is of the form (self)^e_i.
    // Squaring t_i corresponds to multiplying e_i by 2,
    // so the pow2k function shifts e_i left by k places.
    // Multiplying t_i and t_j corresponds to adding e_i + e_j.
    //
    // Temporary t_i                      Nonzero bits of e_i
    //
    let t0  = new IotaFieldElementExtended();
    t0.square(z);                      // 1         e_0 = 2^1
    
    let t1  = new IotaFieldElementExtended();
    t1.square(t0);
    t1.square(t1);                     // 3         e_1 = 2^3

    let t2 = new IotaFieldElementExtended();
    t2.mul(z, t1);                    // 3,0       e_2 = 2^3 + 2^0

    let t3 = new IotaFieldElementExtended();
    t3.mul(t0,t2);                    // 3,1,0
    
    let t4 = new IotaFieldElementExtended();
    t4.square(t3);                    // 4,2,1

    let t5 = new IotaFieldElementExtended();
    t5.mul(t2, t4);                   // 4,3,2,1,0

    let t6 = new IotaFieldElementExtended();
    let t5Bytes: Uint8Array = new Uint8Array();
    t5.toBytes(t5Bytes);
    let t5BytesBN: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger];
    t5BytesBN[0] = bigInt(t5Bytes[0]);
    t5BytesBN[1] = bigInt(t5Bytes[1]);
    t5BytesBN[2] = bigInt(t5Bytes[2]);
    t5BytesBN[3] = bigInt(t5Bytes[3]);
    t5BytesBN[4] = bigInt(t5Bytes[4]);
    t6.pow2k(t5BytesBN, 5);           // 9,8,7,6,5

    let t7 = new IotaFieldElementExtended();
    t7.mul(t6, t5);                   // 9,8,7,6,5,4,3,2,1,0

    let t8 = new IotaFieldElementExtended();
    t8.pow2k()


        
    
    let t9  = &t8 * &t7;               // 19..0
    let t10 = t9.pow2k(20);            // 39..20
    let t11 = &t10 * &t9;              // 39..0
    let t12 = t11.pow2k(10);           // 49..10
    let t13 = &t12 * &t7;              // 49..0
    let t14 = t13.pow2k(50);           // 99..50
    let t15 = &t14 * &t13;             // 99..0
    let t16 = t15.pow2k(100);          // 199..100
    let t17 = &t16 * &t15;             // 199..0
    let t18 = t17.pow2k(50);           // 249..50
    let t19 = &t18 * &t13;             // 249..0

    (t19, t3)
  }

  pow_p58() {
    // The bits of (p-5)/8 are 101111.....11.
    //
    //                                 nonzero bits of exponent
    let (t19, _) = this.pow22501();    // 249..0
    let t20 = t19.pow2k(2);            // 251..2
    let t21 = self * &t20;             // 251..2,0

    t21
  }

  /// Given `k > 0`, return `self^(2^k)`.
  pow2k(a: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger] , k: number/*todo: u32*/) {

    const m = (x: BigInteger, y: BigInteger): BigInteger => { return x.times(y); };

    while(true) {
      let a3_19 = a[3].times(19);
      let a4_19 = a[4].times(19);

      let c0: BigInteger = m(a[0], a[0]).add( m(a[1], a4_19).add( m(a[2], a3_19).times(2) ) );
      let c1: BigInteger = m(a[3], a3_19).add( m(a[0], a[1]).add( m(a[2], a3_19).times(2) ) );
      let c2: BigInteger = m(a[1], a[1]).add( m(a[0], a[2]).add( m(a[4], a3_19).times(2) ) );
      let c3: BigInteger = m(a[4], a4_19).add( m(a[0], a[3]).add( m(a[1], a[2]).times(2) ) );
      let c4: BigInteger = m(a[2], a[2]).add( m(a[0], a[4]).add( m(a[1], a[3]).times(2) ) );

      const LOW_51_BIT_MASK: BigInteger = bigInt(1).shiftLeft(51).minus(1);

      c1 = c1.add( c0.shiftRight(bigInt(51)) );
      a[0] = c0.and(LOW_51_BIT_MASK);

      c2 = c2.add( c1.shiftRight(bigInt(51)) );
      a[1] = c1.and(LOW_51_BIT_MASK);

      c3 = c3.add( c2.shiftRight(bigInt(51)) );
      a[2] = c2.and(LOW_51_BIT_MASK);

      c4 = c4.add( c3.shiftRight(bigInt(51)) );
      a[3] = c3.and(LOW_51_BIT_MASK);

      let carry: BigInteger = c4.shiftRight(51);
      a[4] = c4.and(LOW_51_BIT_MASK);

      a[0] = a[0].add( (carry.times(bigInt(19))) );

      a[1] = a[1].add( a[0].shiftRight(51) );
      a[0] = a[0].and( LOW_51_BIT_MASK );

      k = k - 1;
      if(k===0)
        break;

    }

    a.forEach((n) => {
      if(n.toString() !== n.toJSNumber().toString()) throw('Precision loss detected');
    });
    let aJS = new Int32Array();
    aJS[0] = a[0].toJSNumber();
    aJS[1] = a[1].toJSNumber();
    aJS[2] = a[2].toJSNumber();
    aJS[3] = a[3].toJSNumber();
    aJS[4] = a[4].toJSNumber();
    
    this.data[0] = Number(h0);
    this.data[1] = Number(h1);
    this.data[2] = Number(h2);
    this.data[3] = Number(h3);
    this.data[4] = Number(h4);
    this.data[5] = Number(h5);
    this.data[6] = Number(h6);
    this.data[7] = Number(h7);
    this.data[8] = Number(h8);
    this.data[9] = Number(h9);

    return new IotaFieldElementExtended(aJS);
}
  
}

import * as Digest from "../digest";
import { BigEndianInteger, ByteArray, Uint32, checkType, safeBufferFrom, assertType } from "../../types";
import { EdDSAKey } from "./interfaces";

const fieldElementBase = BigEndianInteger(32).withConstraint(
    x => tinyecc.isPrivate(safeBufferFrom(x)) || `expected ${x} to be within the order of the curve`,
    {name: "FieldElement"},
);
export type FieldElement = Static<typeof fieldElementBase>;
const fieldElementStatic = {};
const fieldElement = Object.assign(fieldElementBase, BigEndianInteger, fieldElementStatic);
export const FieldElement: typeof fieldElement = fieldElement;

const compressedPointBase = ByteArray(33).And(Obj({
    0: Literal(0x02).Or(Literal(0x03)),
})).withConstraint(
    p => FieldElement.test(p.slice(1)) || `expected ${p}.x to be within the order of the curve`,
    {name: "CompressedPoint.x"},
);
export type CompressedPoint = Static<typeof compressedPointBase>;
const compressedPointStatic = {
    from: (p: CurvePoint): CompressedPoint => {
        return (p.length === 33 ? p : CompressedPoint.fromUncompressed(checkType(UncompressedPoint, p)));
    },
    fromUncompressed: (p: UncompressedPoint): CompressedPoint => {
        const out = new Uint8Array(33);
        out[0] = (UncompressedPoint.yIsOdd(p) ? 0x03 : 0x02);
        out.set(UncompressedPoint.x(p), 1);
        CompressedPoint.assert(out);
        return out;
    },
    x: (p: CompressedPoint): FieldElement => { return checkType(FieldElement, p.slice(1)); },
    yIsOdd: (p: CompressedPoint): boolean => { return p[0] === 0x03; }
};
const compressedPoint = Object.assign(compressedPointBase, ByteArray, compressedPointStatic);
export const CompressedPoint: typeof compressedPoint = compressedPoint;

const uncompressedPointBase = ByteArray(65).And(Obj({
    0: Literal(0x04),
})).withConstraint(
    p => FieldElement.test(p.slice(1, 33)) || `expected ${p}.x to be within the order of the curve`,
    {name: "UncompressedPoint.x"},
).withConstraint(
    p => {
        if (!FieldElement.test(p.slice(33, 65))) return `expected ${p}.y to be within the order of the curve`;
        const pBuf = Buffer.from(p);
        if (!ByteArray.equal(tinyecc.pointCompress(tinyecc.pointCompress(pBuf, true), false), pBuf)) return `expected ${p} to be on the curve`;
        return true;
    },
    {name: "UncompressedPoint.y"}
);
export type UncompressedPoint = Static<typeof uncompressedPointBase>;
const uncompressedPointStatic = {
    from: (p: CurvePoint): UncompressedPoint => {
        return (p.length === 65 ? p : UncompressedPoint.fromCompressed(checkType(CompressedPoint, p)));
    },
    fromCompressed: (p: CompressedPoint): UncompressedPoint => {
        return checkType(UncompressedPoint, tinyecc.pointCompress(Buffer.from(p), false));
    },
    x: (p: UncompressedPoint): FieldElement => { return checkType(FieldElement, p.slice(1, 33)); },
    y: (p: UncompressedPoint): FieldElement => { return checkType(FieldElement, p.slice(33, 65)); },
    yIsOdd: (p: UncompressedPoint): boolean => { return FieldElement.isOdd(UncompressedPoint.y(p)); },
};
const uncompressedPoint = Object.assign(uncompressedPointBase, ByteArray, uncompressedPointStatic);
export const UncompressedPoint: typeof uncompressedPoint = uncompressedPoint;

const curvePointBase = CompressedPoint.Or(UncompressedPoint);
export type CurvePoint = CompressedPoint | UncompressedPoint;
const curvePointStatic = {
    x: (p: CurvePoint): FieldElement => (p[0] === 0x04 ? UncompressedPoint.x(p) : CompressedPoint.x(p)),
    yIsOdd: (p: CurvePoint): boolean => (p[0] === 0x04 ? UncompressedPoint.yIsOdd(p) : CompressedPoint.yIsOdd(p)),
    // Equivalent to CompressedPoint.equal(CompressedPoint.from(lhs), CompressedPoint.from(rhs)), but avoids allocations
    equal: (lhs: CurvePoint, rhs: CurvePoint) => CurvePoint.yIsOdd(lhs) === CurvePoint.yIsOdd(rhs) && FieldElement.equal(CurvePoint.x(lhs), CurvePoint.x(rhs)),
};
const curvePoint = Object.assign(curvePointBase, curvePointStatic);
export const CurvePoint: typeof curvePoint = curvePoint;

const recoveryParamBase = Union(Literal(0), Literal(1), Literal(2), Literal(3));
export type RecoveryParam = Static<typeof recoveryParamBase>;
const recoveryParamStatic = {};
const recoveryParam = Object.assign(recoveryParamBase, recoveryParamStatic);
export const RecoveryParam: typeof recoveryParam = recoveryParam;

const messageWithPreimageBase = ByteArray(32).And(Digest.Digest());
export type MessageWithPreimage = Static<typeof messageWithPreimageBase>;
const messageWithPreimageStatic = {};
const messageWithPreimage = Object.assign(messageWithPreimageBase, ByteArray, messageWithPreimageStatic);
export const MessageWithPreimage: typeof messageWithPreimage = messageWithPreimage;

const messageBase = MessageWithPreimage.Or(ByteArray());
export type Message = Static<typeof messageBase>;
const messageStatic = {};
const message = Object.assign(messageBase, ByteArray, messageWithPreimageStatic, messageStatic);
export const Message: typeof message = message;

const signatureBase = ByteArray(64).withConstraint(
    x => FieldElement.test(x.slice(0, 32)) || `expected ${x}.r to be within the order of the curve`,
    {name: "Signature.r"},
).withConstraint(
    x => FieldElement.test(x.slice(32, 64)) || `expected ${x}.s to be within the order of the curve`,
    {name: "Signature.s"},
);
export type Signature = Static<typeof signatureBase>;
const signatureStatic = {
    r: (x: Signature): FieldElement => { return checkType(FieldElement, x.slice(0, 32)); },
    s: (x: Signature): FieldElement => { return checkType(FieldElement, x.slice(32, 64)); },
    isLowR: (x: Signature): boolean => { return !FieldElement.isHigh(Signature.r(x)); },
    isLowS: (x: Signature): boolean => { return !FieldElement.isHigh(Signature.s(x)); },
    isCanonical: (x: Signature): boolean => { return Signature.isLowR(x) && Signature.isLowS(x); },
    signCanonically: async (x: ECDSAKey, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, counter?: Uint32): Promise<Signature> => {
        assertType(ByteArray(), message);
        counter === undefined || Uint32.assert(counter);
        for (let i = counter; i === undefined || i < (counter ?? 0) + 128; i = (i ?? -1) + 1) {
            const sig = await (async () => {
              if (digestAlgorithm === null) {
                assertType(ByteArray(32), message);
                return i === undefined ? await x.ecdsaSign(digestAlgorithm, message) : await x.ecdsaSign(digestAlgorithm, message, i);
              } else {
                return i === undefined ? await x.ecdsaSign(digestAlgorithm, message) : await x.ecdsaSign(digestAlgorithm, message, i);
              }
            })();
            if (sig === undefined) break;
            //TODO: do integrated lowS correction
            if (Signature.isCanonical(sig)) return sig;
        }
        // This is cryptographically impossible (2^-128 chance) if the key is implemented correctly.
        throw new Error(`Unable to generate canonical signature with public key ${x} over message ${message}; is your key implementation broken?`);
    },
    verify: (x: Signature, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, publicKey: CurvePoint): boolean => {
        const msgOrDigest = digestAlgorithm === null ? checkType(ByteArray(32), message) : Digest.Algorithms[digestAlgorithm](checkType(ByteArray(), message));
        return tinyecc.verify(Buffer.from(msgOrDigest), Buffer.from(publicKey), Buffer.from(x));
    },
};
const signature = Object.assign(signatureBase, ByteArray, signatureStatic);
export const Signature: typeof signature = signature;

const recoverableSignatureBase = ByteArray(65).And(Obj({
    64: RecoveryParam,
})).withConstraint(
    x => Signature.test(x.slice(0, 64)) || `expected ${x}.sig to be a valid signature`,
    {name: "Signature"},
);
export type RecoverableSignature = Static<typeof recoverableSignatureBase>;
const recoverableSignatureStatic = {
    from: (x: Signature, recoveryParam: RecoveryParam): RecoverableSignature => {
      return checkType(RecoverableSignature, core.compatibleBufferConcat([x, new Uint8Array([recoveryParam])]));
    },
    fromSignature: async (x: Signature, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, publicKey: CurvePoint): Promise<RecoverableSignature> => {
      for (let recoveryParam: RecoveryParam = 0; recoveryParam < 4; recoveryParam++) {
        const out = RecoverableSignature.from(x, recoveryParam);
        if (!CurvePoint.equal(publicKey, await RecoverableSignature.recoverPublicKey(out, digestAlgorithm, message))) continue;
        return out;
      }
      throw new Error(`couldn't find recovery parameter producing public key ${publicKey} for signature ${x} over message ${message}`);
    },
    sig: (x: RecoverableSignature): Signature => checkType(Signature, x.slice(0, 64)),
    recoveryParam: (x: RecoverableSignature): RecoveryParam => checkType(RecoveryParam, x[64]),
    isLowRecoveryParam: (x: RecoverableSignature) => [0, 1].includes(RecoverableSignature.recoveryParam(x)),
    isCanonical: (x: RecoverableSignature): boolean => Signature.isCanonical(checkType(Signature, RecoverableSignature.sig(x))) && RecoverableSignature.isLowRecoveryParam(x),
    signCanonically: async (x: ECDSAKey, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, counter?: Uint32): Promise<RecoverableSignature> => {
        const publicKey = await x.getPublicKey();
        assertType(ByteArray(), message);
        counter === undefined || Uint32.assert(counter);

        const isIndexable = (x: unknown): x is Record<string, unknown> => x !== null && ["object", "function"].includes(typeof x);
        const isECDSARecoverableKey = (x: ECDSAKey): x is ECDSARecoverableKey => isIndexable(x) && "ecdsaSignRecoverable" in x && typeof x.ecdsaSignRecoverable === "function";

        const ecdsaSignRecoverable = isECDSARecoverableKey(x) ? async (digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, counter?: Uint32) => {
          if (digestAlgorithm === null) {
            assertType(ByteArray(32), message);
            return counter === undefined ? await x.ecdsaSignRecoverable(digestAlgorithm, message) : await x.ecdsaSignRecoverable(digestAlgorithm, message, counter);
          } else {
            return counter === undefined ? await x.ecdsaSignRecoverable(digestAlgorithm, message) : await x.ecdsaSignRecoverable(digestAlgorithm, message, counter);
          }
        } : async (digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, counter?: Uint32) => {
          const sig = await Signature.signCanonically(x, digestAlgorithm, message, counter);
          if (sig === undefined) return undefined;
          return await RecoverableSignature.fromSignature(sig, digestAlgorithm, message, publicKey);
        };

        // Technically, this may waste cycles; if Signature.signCanonically grinds the counter to find a canonical signature which then 
        // ends up to have a non-canonical recovery parameter, those values will all be re-ground. However, signatures can have
        // non-canonical recovery parameters only with negligible probability, so optimization for that case would be silly.
        for (let i = counter; i === undefined || i < (counter ?? 0) + 128; i = (i ?? -1) + 1) {
            const recoverableSig = await ecdsaSignRecoverable(digestAlgorithm, message, i);
            if (recoverableSig === undefined) break;
            //TODO: do integrated lowS correction
            if (RecoverableSignature.isCanonical(recoverableSig)) return recoverableSig;
        }
        // This is cryptographically impossible (2^-128 chance) if the key is implemented correctly.
        throw new Error(`Unable to generate canonical recoverable signature with public key ${Buffer.from(publicKey).toString("hex")} over message ${Buffer.from(message).toString("hex")}; is your key implementation broken?`);
    },
    recoverPublicKey: async (x: RecoverableSignature, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array): Promise<CurvePoint> => {
      // TODO: do this better
      const msgOrDigest = digestAlgorithm === null ? checkType(ByteArray(32), message) : Digest.Algorithms[digestAlgorithm](checkType(ByteArray(), message));
      const sig = RecoverableSignature.sig(x);
      const recoveryParam = RecoverableSignature.recoveryParam(x);
      const ethSig = core.compatibleBufferConcat([sig, Buffer.from([recoveryParam])]);
      const ethRecovered = (await ethers).utils.recoverPublicKey(msgOrDigest, (await ethers).utils.splitSignature(ethSig));
      return checkType(UncompressedPoint, Buffer.from(ethRecovered.slice(2), "hex"));
    },
    r: (x: RecoverableSignature): FieldElement => Signature.r(RecoverableSignature.sig(x)),
    s: (x: RecoverableSignature): FieldElement => Signature.s(RecoverableSignature.sig(x)),
    isLowR: (x: RecoverableSignature): boolean => Signature.isLowR(RecoverableSignature.sig(x)),
    isLowS: (x: RecoverableSignature): boolean => Signature.isLowS(RecoverableSignature.sig(x)),
    verify: (x: RecoverableSignature, digestAlgorithm: Digest.AlgorithmName<32> | null, message: Uint8Array, publicKey: CurvePoint): boolean => {
      return Signature.verify(RecoverableSignature.sig(x), digestAlgorithm, message, publicKey);
    },
};
const recoverableSignature = Object.assign(
  recoverableSignatureBase,
  recoverableSignatureStatic
);
export const RecoverableSignature: typeof recoverableSignature = recoverableSignature;
