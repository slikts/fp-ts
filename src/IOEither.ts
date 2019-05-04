/**
 * @file `IOEither<L, A>` represents a synchronous computation that either yields a value of type `A` or fails yielding an
 * error of type `L`. If you want to represent a synchronous computation that never fails, please see `IO`.
 */
import { Alt2 } from './Alt'
import { Bifunctor2 } from './Bifunctor'
import * as E from './Either'
import { getEitherM } from './EitherT'
import { Predicate, Refinement, Lazy } from './function'
import { IO, io, getSemigroup as getIOSemigroup } from './IO'
import { Monad2 } from './Monad'
import { MonadThrow2 } from './MonadThrow'
import { Monoid } from './Monoid'
import { Semigroup } from './Semigroup'
import { MonadIO2 } from './MonadIO'

const T = getEitherM(io)

declare module './HKT' {
  interface URI2HKT2<L, A> {
    IOEither: IOEither<L, A>
  }
}

export const URI = 'IOEither'

export type URI = typeof URI

/**
 * @since 2.0.0
 */
export interface IOEither<L, A> extends IO<E.Either<L, A>> {}

/**
 * @since 2.0.0
 */
export const fold: <L, A, R>(ma: IOEither<L, A>, onLeft: (l: L) => R, onRight: (a: A) => R) => IO<R> = T.fold

/**
 * @since 2.0.0
 */
export const foldIO: <L, A, R>(ma: IOEither<L, A>, onLeft: (l: L) => IO<R>, onRight: (a: A) => IO<R>) => IO<R> = T.foldM

/**
 * @since 2.0.0
 */
export const mapLeft: <L, A, M>(ma: IOEither<L, A>, f: (l: L) => M) => IOEither<M, A> = T.mapLeft

/**
 * @since 2.0.0
 */
export const getOrElse: <L, A>(ma: IOEither<L, A>, f: (l: L) => A) => IO<A> = T.getOrElse

/**
 * @since 2.0.0
 */
export function filterOrElse<L, A, B extends A>(
  ma: IOEither<L, A>,
  p: Refinement<A, B>,
  zero: (a: A) => L
): IOEither<L, B>
export function filterOrElse<L, A>(ma: IOEither<L, A>, p: Predicate<A>, zero: (a: A) => L): IOEither<L, A>
export function filterOrElse<L, A>(ma: IOEither<L, A>, p: Predicate<A>, zero: (a: A) => L): IOEither<L, A> {
  return io.map(ma, e => E.filterOrElse(e, p, zero))
}

/**
 * @since 2.0.0
 */
export const fromRight: <A>(a: A) => IOEither<never, A> = T.of

/**
 * @since 2.0.0
 */
export const orElse: <L, A, M>(ma: IOEither<L, A>, f: (l: L) => IOEither<M, A>) => IOEither<M, A> = T.orElse

/**
 * @since 2.0.0
 */
export const swap: <L, A>(ma: IOEither<L, A>) => IOEither<A, L> = T.swap

/**
 * @since 2.0.0
 */
export const right: <A>(ma: IO<A>) => IOEither<never, A> = T.right

/**
 * @since 2.0.0
 */
export const left: <L>(ml: IO<L>) => IOEither<L, never> = T.left

/**
 * @since 2.0.0
 */
export const fromLeft: <L>(l: L) => IOEither<L, never> = T.fromLeft

/**
 * @since 2.0.0
 */
export function fromPredicate<L, A, B extends A>(
  predicate: Refinement<A, B>,
  onFalse: (a: A) => L
): (a: A) => IOEither<L, B>
export function fromPredicate<L, A>(predicate: Predicate<A>, onFalse: (a: A) => L): (a: A) => IOEither<L, A>
export function fromPredicate<L, A>(predicate: Predicate<A>, onFalse: (a: A) => L): (a: A) => IOEither<L, A> {
  const f = E.fromPredicate(predicate, onFalse)
  return a => io.of(f(a))
}

/**
 * @since 2.0.0
 */
export function getSemigroup<L, A>(S: Semigroup<A>): Semigroup<IOEither<L, A>> {
  return getIOSemigroup(E.getSemigroup<L, A>(S))
}

/**
 * @since 2.0.0
 */
export function getApplySemigroup<L, A>(S: Semigroup<A>): Semigroup<IOEither<L, A>> {
  return getIOSemigroup(E.getApplySemigroup<L, A>(S))
}

/**
 * @since 2.0.0
 */
export function getApplyMonoid<L, A>(M: Monoid<A>): Monoid<IOEither<L, A>> {
  return {
    concat: getApplySemigroup<L, A>(M).concat,
    empty: fromRight(M.empty)
  }
}

/**
 * Constructs a new `IOEither` from a function that performs a side effect and might throw
 * @since 2.0.0
 */
export function tryCatch<L, A>(f: Lazy<A>, onError: (reason: unknown) => L): IOEither<L, A> {
  return () => E.tryCatch(f, onError)
}

/**
 * Make sure that a resource is cleaned up in the event of an exception. The
 * release action is called regardless of whether the body action throws or
 * returns.
 *
 * @since 2.0.0
 */
export function bracket<L, A, B>(
  acquire: IOEither<L, A>,
  use: (a: A) => IOEither<L, B>,
  release: (a: A, e: E.Either<L, B>) => IOEither<L, void>
): IOEither<L, B> {
  return ioEither.chain(acquire, a =>
    ioEither.chain(io.map(use(a), E.right), e =>
      ioEither.chain(release(a, e), () => E.fold<L, B, IOEither<L, B>>(e, fromLeft, ioEither.of))
    )
  )
}

/**
 * @since 2.0.0
 */
export const ioEither: Monad2<URI> & Bifunctor2<URI> & Alt2<URI> & MonadIO2<URI> & MonadThrow2<URI> = {
  URI,
  bimap: (ma, f, g) => io.map(ma, e => E.either.bimap(e, f, g)),
  map: T.map,
  of: fromRight,
  ap: T.ap,
  chain: T.chain,
  alt: orElse,
  fromIO: right,
  throwError: fromLeft,
  fromEither: io.of,
  fromOption: (o, onNone) => (o._tag === 'None' ? fromLeft(onNone()) : fromRight(o.value))
}
