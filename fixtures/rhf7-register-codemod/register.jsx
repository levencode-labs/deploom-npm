import React from 'react';
import { useForm } from 'react-hook-form';

export default function Form({ onSubmit }) {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        Project name
        <input name="project" ref={register({ required: true })} />
      </label>
      <input name="unrelated" defaultValue="keep" />
      <button type="submit">Save</button>
    </form>
  );
}
